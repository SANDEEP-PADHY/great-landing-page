import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { VerifyRequest, type ApiError, type VerifyResponse } from '@/lib/contracts';
import { db } from '@/lib/db/client';
import { orders } from '@/lib/db/schema';
import { fulfilOrder } from '@/lib/orders';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { signOrderToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'validation' } satisfies ApiError, { status: 400 }); }
  const p = VerifyRequest.safeParse(body);
  if (!p.success) return NextResponse.json({ error: 'validation' } satisfies ApiError, { status: 400 });
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = p.data;

  if (!verifyPaymentSignature(oid, pid, sig)) {
    console.warn('[verify] bad signature for', oid);
    return NextResponse.json({ error: 'bad_signature' } satisfies ApiError, { status: 400 });
  }
  const { order } = await fulfilOrder({ razorpayOrderId: oid, razorpayPaymentId: pid, source: 'verify' });
  const found = order ?? (await db.select().from(orders).where(eq(orders.razorpayOrderId, oid)).limit(1))[0];
  if (!found) return NextResponse.json({ error: 'not_found' } satisfies ApiError, { status: 404 });
  const res: VerifyResponse = { ok: true, redirect: `/thank-you?o=${found.publicId}&t=${signOrderToken(found.publicId)}` };
  return NextResponse.json(res);
}
