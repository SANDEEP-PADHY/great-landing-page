import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { paymentEvents } from '@/lib/db/schema';
import { fulfilOrder, markOrderFailure } from '@/lib/orders';
import { verifyWebhookSignature } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

type Entity = { id?: string; order_id?: string; method?: string; error_description?: string };
type Payload = {
  event?: string;
  payload?: { payment?: { entity?: Entity }; order?: { entity?: Entity } };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
  }
  let evt: Payload;
  try { evt = JSON.parse(raw) as Payload; } catch { return NextResponse.json({ error: 'validation' }, { status: 400 }); }

  const eventId = req.headers.get('x-razorpay-event-id') ?? `noid_${Date.now()}_${Math.random()}`;
  const payment = evt.payload?.payment?.entity;
  const orderEntity = evt.payload?.order?.entity;
  const rzpOrderId = payment?.order_id ?? orderEntity?.id ?? null;

  const inserted = await db.insert(paymentEvents).values({
    razorpayEventId: eventId, type: evt.event ?? 'unknown', razorpayOrderId: rzpOrderId, payload: evt as never,
  }).onConflictDoNothing().returning({ id: paymentEvents.id });
  let row = inserted[0];
  if (!row) {
    // Razorpay retried an event we stored but failed to process: process it again. Only a processed event is a true duplicate.
    const [prev] = await db.select({ id: paymentEvents.id, processedAt: paymentEvents.processedAt })
      .from(paymentEvents).where(eq(paymentEvents.razorpayEventId, eventId)).limit(1);
    if (!prev || prev.processedAt) return NextResponse.json({ ok: true, duplicate: true });
    row = { id: prev.id };
  }

  let error: string | null = null;
  try {
    switch (evt.event) {
      case 'payment.captured':
      case 'order.paid':
        if (rzpOrderId && payment?.id) {
          await fulfilOrder({ razorpayOrderId: rzpOrderId, razorpayPaymentId: payment.id, method: payment.method, source: 'webhook' });
        } else error = 'missing order or payment id';
        break;
      case 'payment.failed':
        if (rzpOrderId) await markOrderFailure(rzpOrderId, payment?.error_description ?? 'payment failed');
        break;
      default:
        break;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error('[webhook] processing failed', evt.event, error);
  }
  await db.update(paymentEvents).set({ processedAt: error ? null : new Date(), error }).where(eq(paymentEvents.id, row.id));
  // Non-2xx makes Razorpay retry the webhook, so a transient failure cannot lose a paid order.
  if (error) return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
