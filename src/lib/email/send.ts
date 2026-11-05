import 'server-only';
import { render } from '@react-email/components';
import { and, eq, isNull } from 'drizzle-orm';
import type { ReactElement } from 'react';
import { Resend } from 'resend';
import { db } from '../db/client';
import { emailLog, orders } from '../db/schema';
import { env } from '../env';
import { buildIcs, googleCalendarUrl } from '../calendar';
import { formatINR } from '../pricing';
import { getSettingsFresh } from '../settings';
import { getOrderById } from '../orders';
import { getSlotRow, toSlotView } from '../slots';
import { timeRangeIST } from '../slot-format';
import { signOrderToken } from '../tokens';
import type { SlotId } from '../contracts';
import { OrderConfirmation } from './templates/OrderConfirmation';
import { AbandonedCheckout } from './templates/AbandonedCheckout';
import { SessionReminder } from './templates/SessionReminder';
import { AdminSaleAlert } from './templates/AdminSaleAlert';

let resend: Resend | undefined;
const client = () => {
  const key = env().RESEND_API_KEY;
  if (!key) return null;
  resend ??= new Resend(key);
  return resend;
};

type Attachment = { filename: string; content: string };
export type SendInput = {
  to: string; template: string; orderId?: string; subject: string; react: ReactElement;
  attachments?: Attachment[]; idempotencyKey?: string; logId?: string;
};

/** Writes email_log (queued → sent/failed). Never throws. */
export async function sendEmail(i: SendInput): Promise<{ ok: boolean; id?: string }> {
  let logId = i.logId;
  try {
    if (!logId) {
      const [row] = await db.insert(emailLog).values({ to: i.to, template: i.template, orderId: i.orderId ?? null }).returning({ id: emailLog.id });
      logId = row?.id;
    }
    const r = client();
    if (!r) throw new Error('RESEND_API_KEY not set');
    const html = await render(i.react);
    const text = await render(i.react, { plainText: true });
    const res = await r.emails.send(
      { from: env().EMAIL_FROM, replyTo: env().EMAIL_REPLY_TO, to: i.to, subject: i.subject, html, text, attachments: i.attachments },
      i.idempotencyKey ? { idempotencyKey: i.idempotencyKey } : undefined,
    );
    if (res.error) throw new Error(res.error.message);
    if (logId) {
      await db.update(emailLog).set({ status: 'sent', resendId: res.data?.id ?? null, sentAt: new Date(), error: null }).where(eq(emailLog.id, logId));
    }
    return { ok: true, id: res.data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email] send failed', i.template, msg);
    if (logId) {
      try {
        const cur = (await db.select({ a: emailLog.attempts }).from(emailLog).where(eq(emailLog.id, logId)))[0];
        await db.update(emailLog).set({ status: 'failed', error: msg.slice(0, 500), attempts: (cur?.a ?? 0) + 1 }).where(eq(emailLog.id, logId));
      } catch { /* ignore */ }
    }
    return { ok: false };
  }
}

const url = (path: string) => `${env().APP_URL}${path}`;
const slotLabel = (s: { dayLabel: string; dateLabel: string; startsAt: Date; endsAt: Date }) => `${s.dayLabel} ${s.dateLabel}, ${timeRangeIST(s)}`;

async function buildConfirmation(orderId: string) {
  const r = await getOrderById(orderId);
  if (!r) return null;
  const settings = await getSettingsFresh();
  const t = signOrderToken(r.order.publicId);
  const sv = toSlotView(r.slot);
  const label = slotLabel(r.slot);
  const react = OrderConfirmation({
    name: r.customer.name, slotLabel: label, whatsappLink: settings.whatsapp_link,
    googleCalUrl: googleCalendarUrl(sv, 'GenZy Club live webinar. Join link will be sent on WhatsApp and email.'),
    icsUrl: url(`/api/calendar/${r.order.publicId}?t=${t}`),
    templateUrl: url(`/api/download/template?o=${r.order.publicId}&t=${t}`),
    invoiceUrl: url(`/invoice/${r.order.publicId}?t=${t}`),
    publicId: r.order.publicId, amountLabel: formatINR(r.order.amountPaise), paymentId: r.order.razorpayPaymentId ?? '-',
    bonusValue: settings.bonus_value, contactEmail: settings.contact_email,
  });
  const ics = buildIcs({ uid: r.order.id, slot: sv, description: 'GenZy Club live webinar. Join link will be sent on WhatsApp and email.' });
  return { r, react, ics, label };
}

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const b = await buildConfirmation(orderId);
  if (!b) return;
  const res = await sendEmail({
    to: b.r.customer.email, template: 'order_confirmation', orderId, subject: `✅ Seat confirmed: ${b.label}`,
    react: b.react, attachments: [{ filename: 'webinar.ics', content: Buffer.from(b.ics).toString('base64') }],
    idempotencyKey: `order_confirmation:${orderId}`,
  });
  if (res.ok) await db.update(orders).set({ confirmationSentAt: new Date() }).where(eq(orders.id, orderId));
}

export async function sendAbandonedCheckout(orderId: string): Promise<void> {
  const r = await getOrderById(orderId);
  if (!r) return;
  const settings = await getSettingsFresh();
  const resumeUrl = url(`/?slot=${r.slot.id}&utm_source=email&utm_campaign=abandoned`);
  const res = await sendEmail({
    to: r.customer.email, template: 'abandoned_checkout', orderId, subject: `Your seat for ${r.slot.dayLabel} ${r.slot.dateLabel} is not booked yet`,
    react: AbandonedCheckout({
      name: r.customer.name, slotLabel: slotLabel(r.slot), resumeUrl, priceLabel: formatINR(settings.offer_price_paise),
      offerEnds: new Date(settings.offer_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }),
    }),
    idempotencyKey: `abandoned_checkout:${orderId}`,
  });
  // mark even on failure to honour "sent once"; the retry job re-sends from email_log
  await db.update(orders).set({ abandonEmailSentAt: new Date() }).where(eq(orders.id, orderId));
  void res;
}

export async function sendSlotReminder(slotId: SlotId, opts?: { resend?: boolean }): Promise<{ sent: number; failed: number }> {
  const slot = await getSlotRow(slotId);
  if (!slot?.webinarUrl) return { sent: 0, failed: 0 };
  const settings = await getSettingsFresh();
  const { customers } = await import('../db/schema');
  const rows = await db.select({ o: orders, c: customers }).from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(eq(orders.slotId, slotId), eq(orders.status, 'paid'), opts?.resend ? undefined : isNull(orders.reminderSentAt)));
  let sent = 0, failed = 0;
  for (const { o, c } of rows) {
    const res = await sendEmail({
      to: c.email, template: 'session_reminder', orderId: o.id, subject: 'Your GenZy Club webinar starts soon',
      react: SessionReminder({ name: c.name, slotLabel: slotLabel(slot), webinarUrl: slot.webinarUrl, whatsappLink: settings.whatsapp_link }),
      idempotencyKey: `session_reminder:${o.id}:${slotId}${opts?.resend ? ':' + Date.now() : ''}`,
    });
    if (res.ok) {
      sent++;
      await db.update(orders).set({ reminderSentAt: new Date() }).where(eq(orders.id, o.id));
    } else failed++;
  }
  return { sent, failed };
}

export async function sendAdminSaleAlert(orderId: string): Promise<void> {
  const settings = await getSettingsFresh();
  if (!settings.email_admin_alert_enabled) return;
  const r = await getOrderById(orderId);
  if (!r) return;
  await sendEmail({
    to: env().ADMIN_ALERT_EMAIL, template: 'admin_sale_alert', orderId, subject: `New sale ${formatINR(r.order.amountPaise)} · ${r.customer.name}`,
    react: AdminSaleAlert({
      amountLabel: formatINR(r.order.amountPaise), name: r.customer.name, slotLabel: slotLabel(r.slot),
      utmContent: r.order.utmContent ?? '', publicId: r.order.publicId,
    }),
    idempotencyKey: `admin_sale_alert:${orderId}`,
  });
}

export async function resendConfirmation(orderId: string): Promise<void> {
  const b = await buildConfirmation(orderId);
  if (!b) return;
  await sendEmail({
    to: b.r.customer.email, template: 'order_confirmation', orderId, subject: `✅ Seat confirmed: ${b.label}`,
    react: b.react, attachments: [{ filename: 'webinar.ics', content: Buffer.from(b.ics).toString('base64') }],
  });
}

/** Re-render and resend failed email_log rows (worker). */
export async function retryFailedEmails(): Promise<number> {
  const { and: a, eq: e, lt } = await import('drizzle-orm');
  const rows = await db.select().from(emailLog).where(a(e(emailLog.status, 'failed'), lt(emailLog.attempts, 3))).limit(20);
  let n = 0;
  for (const row of rows) {
    if (!row.orderId) continue;
    const before = row.attempts;
    if (row.template === 'order_confirmation') await sendOrderConfirmation(row.orderId);
    else if (row.template === 'abandoned_checkout') await sendAbandonedCheckout(row.orderId);
    else if (row.template === 'admin_sale_alert') await sendAdminSaleAlert(row.orderId);
    else continue;
    // old failed row is superseded by the new log row; bump attempts so it is not retried again
    await db.update(emailLog).set({ attempts: Math.max(before, 3) }).where(e(emailLog.id, row.id));
    n++;
  }
  return n;
}
