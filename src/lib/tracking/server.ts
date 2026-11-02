import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { customers, events, orders, visitors } from '@/lib/db/schema';
import { buildCapiItem, enqueueCapi, sendOutboxRowNow } from './capi';
import { parseUa } from './ua';
import { CONTENT_ID, CONTENT_NAME, CURRENCY } from './taxonomy';

type Input = {
  name: 'lead' | 'purchase';
  eventId: string;
  orderId: string;
  customerId: string;
  valuePaise?: number;
};

/** Server-side Lead / Purchase. Logs to `events`, queues a CAPI row with full user data, tries one immediate send. Never throws. */
export async function recordServerEvent(i: Input): Promise<void> {
  try {
    const [row] = await db
      .select({ o: orders, c: customers })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(orders.id, i.orderId))
      .limit(1);
    if (!row) { console.error('[tracking] recordServerEvent: order not found', i.orderId); return; }
    const { o, c } = row;

    const internal = i.name === 'lead' ? 'lead_submit' : 'purchase';
    const metaName = i.name === 'lead' ? 'Lead' : 'Purchase';
    const valueRupees = (i.valuePaise ?? o.amountPaise) / 100;
    const ua = parseUa(o.userAgent);
    const now = new Date();

    await db.insert(events).values({
      eventId: i.eventId,
      name: internal,
      source: 'server',
      visitorId: o.visitorId,
      customerId: c.id,
      orderId: o.id,
      path: '/',
      props: { order_id: o.publicId, slot_id: o.slotId, value: valueRupees, currency: CURRENCY },
      utmSource: o.utmSource, utmCampaign: o.utmCampaign, utmContent: o.utmContent,
      device: ua.device, ip: o.ip, userAgent: o.userAgent,
      isBot: false,
      occurredAt: i.name === 'purchase' ? (o.paidAt ?? now) : now,
    }).onConflictDoNothing();

    if (o.visitorId) {
      await db.update(visitors).set({ customerId: c.id }).where(eq(visitors.id, o.visitorId));
    }

    const item = buildCapiItem({
      eventName: metaName,
      eventId: i.eventId,
      occurredAt: i.name === 'purchase' ? (o.paidAt ?? now) : now,
      url: (o.landingUrl && o.landingUrl.startsWith('http') ? o.landingUrl : process.env.APP_URL) || undefined,
      user: { email: c.email, phone: c.phone, name: c.name, visitorId: o.visitorId, ip: o.ip, userAgent: o.userAgent, fbc: o.fbc, fbp: o.fbp },
      customData: {
        currency: CURRENCY, value: valueRupees, content_ids: [CONTENT_ID], content_type: 'product',
        content_name: CONTENT_NAME, num_items: 1, order_id: o.publicId,
      },
    });
    await enqueueCapi(item);
    await sendOutboxRowNow(i.eventId, metaName, 2000);
  } catch (e) {
    console.error('[tracking] recordServerEvent failed', e);
  }
}
