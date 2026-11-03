import { csvCell, csvResponse, csvStream } from '@/lib/admin/csv';
import { exportOrders, parseOrderFilter, type OrderRow } from '@/lib/admin/data';
import { logAudit } from '@/lib/admin/audit';
import { denyUnlessAdmin } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADER = ['name', 'phone', 'email', 'slot', 'amount', 'status', 'public_id', 'payment_id', 'utm_source', 'utm_campaign', 'utm_content', 'paid_at'];

export async function GET(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseOrderFilter(sp, 'paid');
  await logAudit('export.buyers', null, sp);
  const line = (o: OrderRow) => [
    csvCell(o.name, { text: true }), csvCell(o.phone), csvCell(o.email, { text: true }), csvCell(o.slotLabel), csvCell(o.amountPaise / 100), csvCell(o.status),
    csvCell(o.publicId), csvCell(o.paymentId), csvCell(o.utmSource, { text: true }), csvCell(o.utmCampaign, { text: true }), csvCell(o.utmContent, { text: true }), csvCell(o.paidAt),
  ];
  const name = `buyers${f.slot ? `-${f.slot}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(name, csvStream(HEADER, (offset) => exportOrders(f, offset), line));
}
