import 'dotenv/config';
import { and, eq, isNull, lt, gt, sql as dsql } from 'drizzle-orm';
import { db, sql } from '../src/lib/db/client';
import { orders, slots } from '../src/lib/db/schema';
import { getSettingsFresh } from '../src/lib/settings';
import { retryFailedEmails, sendAbandonedCheckout, sendSlotReminder } from '../src/lib/email/send';
import { registerCapiJob } from '../src/lib/tracking/capi';
import type { SlotId } from '../src/lib/contracts';

type Job = { name: string; everyMs: number; fn: () => Promise<void>; running: boolean; timer?: NodeJS.Timeout };
const jobs: Job[] = [];
let stopping = false;

function register(name: string, everyMs: number, fn: () => Promise<void>) {
  const job: Job = { name, everyMs, fn, running: false };
  jobs.push(job);
  const tick = async () => {
    if (stopping || job.running) return;
    job.running = true;
    const t0 = Date.now();
    try {
      await job.fn();
    } catch (e) {
      console.error(`[worker] ${name} failed`, e);
    } finally {
      job.running = false;
      const ms = Date.now() - t0;
      if (ms > 2000) console.log(`[worker] ${name} took ${ms}ms`);
    }
  };
  job.timer = setInterval(tick, everyMs);
  void tick();
}

// --- WS1 jobs -------------------------------------------------------------
register('email-retry', 2 * 60_000, async () => {
  const n = await retryFailedEmails();
  if (n) console.log(`[worker] email-retry resent ${n}`);
});

register('abandoned-emails', 5 * 60_000, async () => {
  const s = await getSettingsFresh();
  if (!s.email_abandoned_enabled) return;
  const now = Date.now();
  const older = new Date(now - s.email_abandoned_delay_min * 60_000);
  const newer = new Date(now - 24 * 3600_000);
  const rows = await db.select({ id: orders.id, customerId: orders.customerId }).from(orders)
    .innerJoin(slots, eq(orders.slotId, slots.id))
    .where(and(
      eq(orders.status, 'pending'), isNull(orders.abandonEmailSentAt),
      lt(orders.createdAt, older), gt(orders.createdAt, newer), gt(slots.startsAt, new Date(now)),
      dsql`not exists (select 1 from orders p where p.customer_id = ${orders.customerId} and p.status = 'paid')`,
    ))
    .limit(30);
  // one email per customer even if several pending orders
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.customerId)) {
      await db.update(orders).set({ abandonEmailSentAt: new Date() }).where(eq(orders.id, r.id));
      continue;
    }
    seen.add(r.customerId);
    await sendAbandonedCheckout(r.id);
  }
  if (rows.length) console.log(`[worker] abandoned-emails processed ${rows.length}`);
});

register('auto-reminders', 60_000, async () => {
  const s = await getSettingsFresh();
  if (!s.email_auto_reminder_enabled) return;
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60_000);
  const due = await db.select().from(slots).where(and(gt(slots.startsAt, now), lt(slots.startsAt, soon)));
  for (const slot of due) {
    if (!slot.webinarUrl) continue;
    const r = await sendSlotReminder(slot.id as SlotId); // skips buyers already reminded
    if (r.sent || r.failed) console.log(`[worker] reminder ${slot.id}`, r);
  }
});

// --- WS4 jobs (capi-outbox) ---------------------------------------------------
registerCapiJob(register);

console.log(`[worker] started with jobs: ${jobs.map((j) => j.name).join(', ')}`);

async function shutdown(sig: string) {
  if (stopping) return;
  stopping = true;
  console.log(`[worker] ${sig}, shutting down`);
  jobs.forEach((j) => j.timer && clearInterval(j.timer));
  const deadline = Date.now() + 10_000;
  while (jobs.some((j) => j.running) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
  await sql.end({ timeout: 3 }).catch(() => undefined);
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
