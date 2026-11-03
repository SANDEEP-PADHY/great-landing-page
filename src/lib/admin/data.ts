// Admin read queries (orders, buyers, abandoned, slots, emails). [WS3]
import 'server-only';
import { and, count, desc, eq, ilike, inArray, lt, or, sql, sum, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { customers, emailLog, orders, slots, visitors } from '@/lib/db/schema';
import { first, resolveRange } from './time';
import { SLOT_IDS, type DateRange } from '@/lib/contracts';

type Params = Record<string, string | string[] | undefined>;
export const PAGE_SIZE = 50;
export const ABANDON_AFTER_MIN = 15;

export type OrderFilter = {
  q?: string;
  slot?: string;
  status: 'paid' | 'pending' | 'failed' | 'expired' | 'all';
  watched?: 'yes' | 'no';
  contacted?: 'yes' | 'no';
  range?: DateRange; // undefined = all time
};

export function parseOrderFilter(sp: Params, defaultStatus: OrderFilter['status'] = 'paid'): OrderFilter {
  const st = first(sp.status);
  const status = (['paid', 'pending', 'failed', 'expired', 'all'] as const).find((s) => s === st) ?? defaultStatus;
  const slot = first(sp.slot);
  const r = resolveRange(sp, 'all');
  return {
    q: first(sp.q)?.trim() || undefined,
    slot: SLOT_IDS.find((s) => s === slot),
    status,
    watched: first(sp.watched) === 'yes' ? 'yes' : first(sp.watched) === 'no' ? 'no' : undefined,
    contacted: first(sp.contacted) === 'yes' ? 'yes' : first(sp.contacted) === 'no' ? 'no' : undefined,
    range: r.key === 'all' ? undefined : r.range,
  };
}

function orderWhere(f: OrderFilter, abandoned = false): SQL | undefined {
  const c: (SQL | undefined)[] = [];
  if (abandoned) {
    c.push(inArray(orders.status, ['pending', 'failed', 'expired']));
    c.push(lt(orders.createdAt, new Date(Date.now() - ABANDON_AFTER_MIN * 60_000)));
    // latest unpaid order per customer who has never paid
    c.push(sql`${orders.id} in (select distinct on (customer_id) id from orders where status <> 'paid' and customer_id not in (select customer_id from orders where status = 'paid') order by customer_id, created_at desc)`);
  } else if (f.status !== 'all') {
    c.push(eq(orders.status, f.status));
  }
  if (f.slot) c.push(eq(orders.slotId, f.slot));
  if (f.watched) c.push(eq(orders.watchedFull, f.watched === 'yes'));
  if (f.contacted) c.push(f.contacted === 'yes' ? sql`${orders.contactedAt} is not null` : sql`${orders.contactedAt} is null`);
  if (f.range) {
    c.push(sql`coalesce(${orders.paidAt}, ${orders.createdAt}) >= ${f.range.from.toISOString()}::timestamptz`);
    c.push(sql`coalesce(${orders.paidAt}, ${orders.createdAt}) <= ${f.range.to.toISOString()}::timestamptz`);
  }
  if (f.q) {
    const t = `%${f.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    c.push(or(ilike(customers.name, t), ilike(customers.email, t), ilike(customers.phone, t), ilike(orders.publicId, t), ilike(orders.razorpayPaymentId, t), ilike(orders.razorpayOrderId, t)));
  }
  return and(...c);
}

const orderCols = {
  id: orders.id,
  publicId: orders.publicId,
  status: orders.status,
  amountPaise: orders.amountPaise,
  paymentId: orders.razorpayPaymentId,
  method: orders.paymentMethod,
  failure: orders.lastFailureReason,
  utmSource: orders.utmSource,
  utmCampaign: orders.utmCampaign,
  utmContent: orders.utmContent,
  paidAt: orders.paidAt,
  createdAt: orders.createdAt,
  watchedFull: orders.watchedFull,
  bonusGiven: orders.bonusGiven,
  contactedAt: orders.contactedAt,
  abandonEmailSentAt: orders.abandonEmailSentAt,
  name: customers.name,
  phone: customers.phone,
  email: customers.email,
  slotId: slots.id,
  slotLabel: sql<string>`${slots.dayLabel} || ' ' || ${slots.dateLabel}`,
};
function base() {
  return db.select(orderCols).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(slots, eq(orders.slotId, slots.id));
}
export type OrderRow = Awaited<ReturnType<typeof base>>[number];

export async function listOrders(f: OrderFilter, page: number, opts: { abandoned?: boolean } = {}) {
  const where = orderWhere(f, opts.abandoned);
  const [rows, [tot]] = await Promise.all([
    base().where(where).orderBy(desc(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ c: count() }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where),
  ]);
  return { rows, total: Number(tot?.c ?? 0) };
}

export async function exportOrders(f: OrderFilter, offset: number, limit = 500, opts: { abandoned?: boolean } = {}) {
  const rows = await base().where(orderWhere(f, opts.abandoned)).orderBy(desc(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`), orders.id).limit(limit).offset(offset);
  return rows;
}

export async function getOrderDetail(orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const [o] = await db.select({ order: orders, customer: customers, slot: slots }).from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(slots, eq(orders.slotId, slots.id)).where(eq(orders.id, orderId));
  if (!o) return null;
  const [visitor, emails, otherOrders] = await Promise.all([
    o.order.visitorId ? db.select().from(visitors).where(eq(visitors.id, o.order.visitorId)).then((r) => r[0] ?? null) : Promise.resolve(null),
    db.select().from(emailLog).where(eq(emailLog.orderId, orderId)).orderBy(desc(emailLog.createdAt)),
    db.select({ id: orders.id, publicId: orders.publicId, status: orders.status, createdAt: orders.createdAt }).from(orders)
      .where(and(eq(orders.customerId, o.customer.id), sql`${orders.id} <> ${orderId}`)).orderBy(desc(orders.createdAt)).limit(10),
  ]);
  return { ...o, visitor, emails, otherOrders };
}

export async function recentSales(limit = 10) {
  return db.select({
    id: orders.id, name: customers.name, amountPaise: orders.amountPaise, paidAt: orders.paidAt,
    utmContent: orders.utmContent, utmSource: orders.utmSource, slotLabel: sql<string>`${slots.dayLabel} || ' ' || ${slots.dateLabel}`,
  }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(slots, eq(orders.slotId, slots.id))
    .where(eq(orders.status, 'paid')).orderBy(desc(orders.paidAt)).limit(limit);
}

export async function slotStats() {
  const [rows, stats] = await Promise.all([
    db.select().from(slots).orderBy(slots.sort, slots.startsAt),
    db.select({ slotId: orders.slotId, buyers: count(), revenue: sum(orders.amountPaise) }).from(orders).where(eq(orders.status, 'paid')).groupBy(orders.slotId),
  ]);
  return rows.map((s) => {
    const st = stats.find((x) => x.slotId === s.id);
    return { ...s, buyers: Number(st?.buyers ?? 0), revenuePaise: Number(st?.revenue ?? 0) };
  });
}

export async function listEmails(page: number, status?: string) {
  const where = status === 'failed' || status === 'queued' || status === 'sent' ? eq(emailLog.status, status) : undefined;
  const [rows, [tot]] = await Promise.all([
    db.select({ log: emailLog, publicId: orders.publicId }).from(emailLog).leftJoin(orders, eq(emailLog.orderId, orders.id))
      .where(where).orderBy(desc(emailLog.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ c: count() }).from(emailLog).where(where),
  ]);
  return { rows, total: Number(tot?.c ?? 0) };
}
