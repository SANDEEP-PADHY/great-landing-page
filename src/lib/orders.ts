import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, eq, gt, ne } from 'drizzle-orm';
import { db } from './db/client';
import { customers, orders, slots, visitors } from './db/schema';
import type { CreateOrderRequest, CreateOrderResponse, OrderReceipt, SlotId } from './contracts';
import { requireEnv } from './env';
import { getSettings } from './settings';
import { getSlotRow, isSlotBookable, toSlotView } from './slots';
import { getCurrentPricePaise } from './pricing';
import { razorpay } from './razorpay';
import { verifyOrderToken } from './tokens';
import { recordServerEvent } from './tracking/server';
import { sendAdminSaleAlert, sendOrderConfirmation } from './email/send';

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function generatePublicId(): string {
  const b = randomBytes(6);
  let s = '';
  for (const x of b) s += B32[x % 32];
  return `GZ-${s}`;
}

export class OrderError extends Error {
  constructor(public code: 'slot_closed' | 'sales_closed' | 'payment_provider' | 'not_found') {
    super(code);
  }
}

export type Attribution = {
  visitorId?: string | null; fbc?: string | null; fbp?: string | null; attr?: Record<string, string | undefined> | null;
  ip?: string | null; userAgent?: string | null;
};

export function parseAttr(raw: string | undefined): Record<string, string | undefined> | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? (o as Record<string, string>) : null;
  } catch {
    return null;
  }
}

function slotDescription(s: { dayLabel: string; dateLabel: string }): string {
  return `Live webinar seat · ${s.dayLabel} ${s.dateLabel}, 7–9 PM IST`;
}

export async function createCheckoutOrder(input: CreateOrderRequest, at: Attribution): Promise<CreateOrderResponse> {
  const now = new Date();
  const settings = await getSettings();
  if (!settings.sales_open) throw new OrderError('sales_closed');
  const slot = await getSlotRow(input.slotId);
  if (!slot || !isSlotBookable(slot, now)) throw new OrderError('slot_closed');
  const amount = getCurrentPricePaise(settings, now);
  const phone = `+91${input.phone}`;

  const [customer] = await db
    .insert(customers)
    .values({ name: input.name, phone, email: input.email, visitorId: at.visitorId ?? null })
    .onConflictDoUpdate({
      target: customers.phone,
      set: { name: input.name, email: input.email, visitorId: at.visitorId ?? null, updatedAt: now },
    })
    .returning();
  if (!customer) throw new Error('customer upsert failed');

  const prefill = { name: input.name, email: input.email, contact: phone };
  const keyId = requireEnv('RAZORPAY_KEY_ID');
  const description = slotDescription(slot);

  // reuse a recent pending order for the same phone + slot + amount
  const recent = (
    await db.select().from(orders).where(
      and(
        eq(orders.customerId, customer.id), eq(orders.slotId, slot.id), eq(orders.status, 'pending'),
        eq(orders.amountPaise, amount), gt(orders.createdAt, new Date(now.getTime() - 30 * 60_000)),
      ),
    ).limit(1)
  )[0];
  if (recent) {
    await db.update(orders).set({ leadEventId: input.leadEventId, updatedAt: now }).where(eq(orders.id, recent.id));
    return { publicId: recent.publicId, razorpayOrderId: recent.razorpayOrderId, amount, currency: 'INR', keyId, prefill, description };
  }

  const publicId = generatePublicId();
  let rzpOrderId: string;
  try {
    const o = await razorpay().orders.create({
      amount, currency: 'INR', receipt: publicId, notes: { publicId, slotId: slot.id, phone },
    });
    rzpOrderId = o.id;
  } catch (e) {
    console.error('[razorpay] orders.create failed', e);
    throw new OrderError('payment_provider');
  }

  const a = at.attr ?? {};
  const [order] = await db.insert(orders).values({
    publicId, customerId: customer.id, slotId: slot.id, amountPaise: amount, razorpayOrderId: rzpOrderId,
    visitorId: at.visitorId ?? null,
    utmSource: a.utm_source ?? null, utmMedium: a.utm_medium ?? null, utmCampaign: a.utm_campaign ?? null,
    utmContent: a.utm_content ?? null, utmTerm: a.utm_term ?? null, fbclid: a.fbclid ?? null,
    fbc: at.fbc ?? null, fbp: at.fbp ?? null, landingUrl: a.landing_url ?? null, referrer: a.referrer ?? null,
    ip: at.ip ?? null, userAgent: at.userAgent ?? null, leadEventId: input.leadEventId,
  }).returning();
  if (!order) throw new Error('order insert failed');

  if (at.visitorId) {
    try { await db.update(visitors).set({ customerId: customer.id }).where(eq(visitors.id, at.visitorId)); } catch { /* visitor row may not exist */ }
  }
  try {
    await recordServerEvent({ name: 'lead', eventId: input.leadEventId, orderId: order.id, customerId: customer.id });
  } catch (e) { console.error('[tracking] lead failed', e); }

  return { publicId, razorpayOrderId: rzpOrderId, amount, currency: 'INR', keyId, prefill, description };
}

export async function fulfilOrder(input: {
  razorpayOrderId: string; razorpayPaymentId: string; method?: string | null; source: 'verify' | 'webhook';
}): Promise<{ order: typeof orders.$inferSelect | null; firstTime: boolean }> {
  const now = new Date();
  const rows = await db.update(orders)
    .set({ status: 'paid', razorpayPaymentId: input.razorpayPaymentId, paymentMethod: input.method ?? null, paidAt: now, updatedAt: now })
    .where(and(eq(orders.razorpayOrderId, input.razorpayOrderId), ne(orders.status, 'paid')))
    .returning();
  const order = rows[0];
  if (!order) {
    const existing = (await db.select().from(orders).where(eq(orders.razorpayOrderId, input.razorpayOrderId)).limit(1))[0] ?? null;
    if (!existing) console.warn('[fulfil] unknown razorpay order', input.razorpayOrderId);
    return { order: existing, firstTime: false };
  }
  console.log(`[fulfil] ${order.publicId} paid via ${input.source}`);
  const run = async (name: string, fn: () => Promise<unknown>) => {
    try { await fn(); } catch (e) { console.error(`[fulfil] ${name} failed`, e); }
  };
  await run('confirmation', () => sendOrderConfirmation(order.id));
  await run('purchase-event', () => recordServerEvent({
    name: 'purchase', eventId: `purchase_${order.id}`, orderId: order.id, customerId: order.customerId, valuePaise: order.amountPaise,
  }));
  await run('admin-alert', () => sendAdminSaleAlert(order.id));
  return { order, firstTime: true };
}

export async function markOrderFailure(razorpayOrderId: string, reason: string): Promise<void> {
  await db.update(orders).set({ lastFailureReason: reason.slice(0, 300), updatedAt: new Date() })
    .where(and(eq(orders.razorpayOrderId, razorpayOrderId), eq(orders.status, 'pending')));
}

export async function changeOrderSlot(orderId: string, slotId: SlotId): Promise<void> {
  const slot = await getSlotRow(slotId);
  if (!slot) throw new OrderError('not_found');
  await db.update(orders).set({ slotId, updatedAt: new Date(), reminderSentAt: null }).where(eq(orders.id, orderId));
}

export async function getOrderByPublicId(publicId: string) {
  const rows = await db.select({ order: orders, customer: customers, slot: slots })
    .from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(slots, eq(orders.slotId, slots.id))
    .where(eq(orders.publicId, publicId)).limit(1);
  return rows[0] ?? null;
}
export async function getOrderById(orderId: string) {
  const rows = await db.select({ order: orders, customer: customers, slot: slots })
    .from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(slots, eq(orders.slotId, slots.id))
    .where(eq(orders.id, orderId)).limit(1);
  return rows[0] ?? null;
}

export async function getOrderReceipt(publicId: string, token: string): Promise<OrderReceipt | null> {
  if (!verifyOrderToken(publicId, token)) return null;
  const r = await getOrderByPublicId(publicId);
  if (!r) return null;
  return {
    orderId: r.order.id, publicId: r.order.publicId, status: r.order.status, amountPaise: r.order.amountPaise,
    paymentId: r.order.razorpayPaymentId, method: r.order.paymentMethod,
    paidAt: r.order.paidAt?.toISOString() ?? null, createdAt: r.order.createdAt.toISOString(),
    customer: { name: r.customer.name, email: r.customer.email, phone: r.customer.phone },
    slot: toSlotView(r.slot),
  };
}


