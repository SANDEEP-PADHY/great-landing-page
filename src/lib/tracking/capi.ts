import 'server-only';
import { and, asc, eq, gt, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { capiOutbox, customers, orders, visitors } from '@/lib/db/schema';
import { getSettings } from '@/lib/settings';
import { hashEmail, hashExternalId, hashName, hashPhone, sha256, splitName } from './hash';

const MAX_ATTEMPTS = 6;
const MAX_AGE_MS = 7 * 86_400_000;
const BATCH = 500;

export type UserDataInput = {
  email?: string | null; phone?: string | null; name?: string | null;
  visitorId?: string | null; ip?: string | null; userAgent?: string | null;
  fbc?: string | null; fbp?: string | null;
};

export function buildUserData(u: UserDataInput): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if (u.email) d.em = [hashEmail(u.email)];
  if (u.phone) d.ph = [hashPhone(u.phone)];
  if (u.name) {
    const { first, last } = splitName(u.name);
    if (first) d.fn = [hashName(first)];
    if (last) d.ln = [hashName(last)];
  }
  if (u.email || u.phone) d.country = [sha256('in')];
  if (u.visitorId) d.external_id = [hashExternalId(u.visitorId)];
  if (u.ip) d.client_ip_address = u.ip;
  if (u.userAgent) d.client_user_agent = u.userAgent;
  if (u.fbc) d.fbc = u.fbc;
  if (u.fbp) d.fbp = u.fbp;
  return d;
}

export type CapiItem = {
  event_name: string; event_time: number; event_id: string; action_source: 'website';
  event_source_url?: string; user_data: Record<string, unknown>; custom_data?: Record<string, unknown>;
};

export function buildCapiItem(i: {
  eventName: string; eventId: string; occurredAt: Date; url?: string;
  user: UserDataInput; customData?: Record<string, unknown>;
}): CapiItem {
  // Meta rejects events older than 7 days; never send future times.
  const now = Date.now();
  const t = Math.min(now, Math.max(now - MAX_AGE_MS + 60_000, i.occurredAt.getTime()));
  return {
    event_name: i.eventName,
    event_time: Math.floor(t / 1000),
    event_id: i.eventId,
    action_source: 'website',
    ...(i.url ? { event_source_url: i.url } : {}),
    user_data: buildUserData(i.user),
    ...(i.customData && Object.keys(i.customData).length ? { custom_data: i.customData } : {}),
  };
}

/** Once the visitor has become a customer (lead), later events carry em/ph/fn/ln too. */
export async function loadCustomerForVisitor(visitorId: string | null | undefined) {
  if (!visitorId) return null;
  const [row] = await db
    .select({ name: customers.name, email: customers.email, phone: customers.phone })
    .from(visitors)
    .innerJoin(customers, eq(customers.id, visitors.customerId))
    .where(eq(visitors.id, visitorId))
    .limit(1);
  return row ?? null;
}

export async function enqueueCapi(item: CapiItem): Promise<void> {
  await db
    .insert(capiOutbox)
    .values({ eventId: item.event_id, eventName: item.event_name, payload: item })
    .onConflictDoNothing();
}

function cfg() {
  return {
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '',
    token: process.env.META_CAPI_ACCESS_TOKEN ?? '',
    version: process.env.META_GRAPH_VERSION || 'v24.0',
  };
}

async function testCode(): Promise<string | undefined> {
  try {
    const s = await getSettings();
    if (s.capi_test_event_code) return s.capi_test_event_code;
  } catch { /* settings unavailable */ }
  return process.env.META_TEST_EVENT_CODE || undefined;
}

type MetaResponse = { events_received?: number; fbtrace_id?: string; error?: { message?: string; code?: number; fbtrace_id?: string } };

async function postToMeta(items: CapiItem[], timeoutMs: number): Promise<{ status: number; body: MetaResponse }> {
  const { pixelId, token, version } = cfg();
  if (!pixelId || !token) return { status: 0, body: { error: { message: 'META_CAPI_ACCESS_TOKEN or NEXT_PUBLIC_META_PIXEL_ID not configured' } } };
  const code = await testCode();
  const res = await fetch(`https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: items, ...(code ? { test_event_code: code } : {}) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await res.json().catch(() => ({}))) as MetaResponse;
  return { status: res.status, body };
}

type OutboxRow = typeof capiOutbox.$inferSelect;

async function settle(rows: OutboxRow[], status: number, body: MetaResponse) {
  const ids = rows.map((r) => r.id);
  if (status >= 200 && status < 300) {
    await db.update(capiOutbox)
      .set({ status: 'sent', sentAt: new Date(), fbtraceId: body.fbtrace_id ?? null, lastError: null })
      .where(sql`${capiOutbox.id} = ANY(${ids})`);
    return;
  }
  const message = body.error?.message ?? `HTTP ${status || 'network error'}`;
  // 4xx (except 429): the payload itself is bad, retrying will not help.
  const permanent = status >= 400 && status < 500 && status !== 429;
  for (const r of rows) {
    const attempts = r.attempts + 1;
    const dead = permanent || attempts >= MAX_ATTEMPTS;
    await db.update(capiOutbox).set({
      attempts,
      status: dead ? 'failed' : 'pending',
      lastError: message.slice(0, 500),
      fbtraceId: body.error?.fbtrace_id ?? body.fbtrace_id ?? null,
      nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000),
    }).where(eq(capiOutbox.id, r.id));
  }
}

/** Try to send one outbox row right now (used right after a server event). Never throws. */
export async function sendOutboxRowNow(eventId: string, eventName: string, timeoutMs = 2000): Promise<void> {
  try {
    const [row] = await db.select().from(capiOutbox)
      .where(and(eq(capiOutbox.eventId, eventId), eq(capiOutbox.eventName, eventName), eq(capiOutbox.status, 'pending')))
      .limit(1);
    if (!row) return;
    const { status, body } = await postToMeta([row.payload as CapiItem], timeoutMs);
    await settle([row], status, body);
  } catch { /* the worker will retry */ }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function settleTx(tx: Tx, r: OutboxRow, status: number, body: MetaResponse) {
  if (status >= 200 && status < 300) {
    await tx.update(capiOutbox)
      .set({ status: 'sent', sentAt: new Date(), fbtraceId: body.fbtrace_id ?? null, lastError: null })
      .where(eq(capiOutbox.id, r.id));
    return;
  }
  const permanent = status >= 400 && status < 500 && status !== 429;
  const attempts = r.attempts + 1;
  await tx.update(capiOutbox).set({
    attempts,
    status: permanent || attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
    lastError: (body.error?.message ?? `HTTP ${status || 'network error'}`).slice(0, 500),
    fbtraceId: body.error?.fbtrace_id ?? null,
    nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000),
  }).where(eq(capiOutbox.id, r.id));
}

export async function runCapiBatch(): Promise<void> {
  // Rows Meta would reject anyway.
  await db.update(capiOutbox)
    .set({ status: 'failed', lastError: 'older than 7 days' })
    .where(and(eq(capiOutbox.status, 'pending'), lte(capiOutbox.createdAt, new Date(Date.now() - MAX_AGE_MS))));

  await db.transaction(async (tx) => {
    const rows = await tx.select().from(capiOutbox)
      .where(and(eq(capiOutbox.status, 'pending'), lte(capiOutbox.nextAttemptAt, new Date())))
      .orderBy(asc(capiOutbox.id)).limit(BATCH).for('update', { skipLocked: true });
    if (!rows.length) return;
    let res: { status: number; body: MetaResponse };
    try {
      res = await postToMeta(rows.map((r) => r.payload as CapiItem), 15_000);
    } catch (e) {
      res = { status: 0, body: { error: { message: e instanceof Error ? e.message : 'network error' } } };
    }
    const ids = rows.map((r) => r.id);
    if (res.status >= 200 && res.status < 300) {
      await tx.update(capiOutbox)
        .set({ status: 'sent', sentAt: new Date(), fbtraceId: res.body.fbtrace_id ?? null, lastError: null })
        .where(sql`${capiOutbox.id} = ANY(${ids})`);
      return;
    }
    const message = res.body.error?.message ?? `HTTP ${res.status || 'network error'}`;
    const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
    if (permanent && rows.length > 1) {
      // One bad event must not fail the other 499: re-send each row on its own and settle it individually.
      for (const r of rows) {
        let one: { status: number; body: MetaResponse };
        try { one = await postToMeta([r.payload as CapiItem], 10_000); }
        catch (e) { one = { status: 0, body: { error: { message: e instanceof Error ? e.message : 'network error' } } }; }
        await settleTx(tx, r, one.status, one.body);
      }
      return;
    }
    for (const r of rows) {
      const attempts = r.attempts + 1;
      const dead = permanent || attempts >= MAX_ATTEMPTS;
      await tx.update(capiOutbox).set({
        attempts, status: dead ? 'failed' : 'pending', lastError: message.slice(0, 500),
        fbtraceId: res.body.error?.fbtrace_id ?? null,
        nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000),
      }).where(eq(capiOutbox.id, r.id));
    }
  });
}

/** Safety net: a paid order whose server Purchase never got queued (crash/DB blip after payment) is re-recorded. Idempotent via event_id. */
export async function reconcilePurchases(): Promise<void> {
  const { recordServerEvent } = await import('./server');
  const missing = await db
    .select({ id: orders.id, customerId: orders.customerId, amountPaise: orders.amountPaise })
    .from(orders)
    .where(and(
      eq(orders.status, 'paid'),
      gt(orders.paidAt, new Date(Date.now() - MAX_AGE_MS + 3600_000)),
      lte(orders.paidAt, new Date(Date.now() - 2 * 60_000)),
      sql`NOT EXISTS (SELECT 1 FROM ${capiOutbox} o WHERE o.event_id = 'purchase_' || ${orders.id}::text AND o.event_name = 'Purchase')`,
    ))
    .limit(50);
  for (const o of missing) {
    console.warn('[capi] reconciling missing Purchase for order', o.id);
    await recordServerEvent({ name: 'purchase', eventId: `purchase_${o.id}`, orderId: o.id, customerId: o.customerId, valuePaise: o.amountPaise });
  }
}

export function registerCapiJob(register: (name: string, everyMs: number, fn: () => Promise<void>) => void): void {
  register('capi-outbox', 5000, runCapiBatch);
  register('capi-purchase-reconcile', 5 * 60_000, reconcilePurchases);
}

/** Admin "send test event" button: sends a PageView straight to Meta (shows in Test events if a test code is set). */
export async function sendCapiTestEvent(): Promise<{ ok: boolean; fbtraceId?: string; error?: string }> {
  try {
    const item = buildCapiItem({
      eventName: 'PageView',
      eventId: `admin_test_${Date.now()}`,
      occurredAt: new Date(),
      url: process.env.APP_URL,
      user: { visitorId: 'admin-test', ip: '203.0.113.1', userAgent: 'Mozilla/5.0 (admin test event)' },
    });
    const { status, body } = await postToMeta([item], 10_000);
    if (status >= 200 && status < 300) return { ok: true, fbtraceId: body.fbtrace_id };
    return { ok: false, error: body.error?.message ?? `HTTP ${status || 'network error'}`, fbtraceId: body.error?.fbtrace_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }
}
