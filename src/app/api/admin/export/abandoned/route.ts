import { csvCell, csvResponse, csvStream } from '@/lib/admin/csv';
import { exportOrders, parseOrderFilter, type OrderRow } from '@/lib/admin/data';
import { logAudit } from '@/lib/admin/audit';
import { denyUnlessAdmin } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADER = ['name', 'phone', 'email', 'slot', 'created_at', 'abandon_email_sent_at', 'last_failure_reason', 'contacted_at', 'public_id', 'utm_source', 'utm_campaign', 'utm_content'];

export async function GET(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseOrderFilter(sp, 'all');
  await logAudit('export.abandoned', null, sp);
  const line = (o: OrderRow) => [
    csvCell(o.name, { text: true }), csvCell(o.phone), csvCell(o.email, { text: true }), csvCell(o.slotLabel), csvCell(o.createdAt), csvCell(o.abandonEmailSentAt),
    csvCell(o.failure, { text: true }), csvCell(o.contactedAt), csvCell(o.publicId), csvCell(o.utmSource, { text: true }), csvCell(o.utmCampaign, { text: true }), csvCell(o.utmContent, { text: true }),
  ];
  return csvResponse(`abandoned-${new Date().toISOString().slice(0, 10)}.csv`, csvStream(HEADER, (offset) => exportOrders(f, offset, 500, { abandoned: true }), line));
}
