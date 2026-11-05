import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Empty, PageHeader, Pagination, RangePicker, StatusBadge, TableBox, btn, btnPrimary, hrefWith, input, td, th } from '@/components/admin/ui';
import { PAGE_SIZE, listOrders, parseOrderFilter } from '@/lib/admin/data';
import { first, fmtDateTime, resolveRange } from '@/lib/admin/time';
import { getSlotRows } from '@/lib/slots';
import { formatINR } from '@/lib/pricing';

export const metadata: Metadata = { title: 'Buyers' };
export const dynamic = 'force-dynamic';

export default async function BuyersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = parseOrderFilter(sp, 'paid');
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const [{ rows, total }, slots] = await Promise.all([listOrders(f, page), getSlotRows()]);
  const r = resolveRange(sp, 'all');
  const exportHref = hrefWith('/api/admin/export/buyers', sp, { page: undefined });

  return (
    <>
      <PageHeader title="Buyers" subtitle="Paid orders by default. Switch status to see leads and failed payments."
        actions={<a className={btnPrimary} href={exportHref}>Export CSV</a>} />

      <form method="get" className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <input name="q" defaultValue={f.q} placeholder="Search name, phone, email, GZ-… or pay_…" className={`${input} lg:col-span-2`} />
        <select name="slot" defaultValue={f.slot ?? ''} className={input} aria-label="Slot">
          <option value="">All slots</option>
          {slots.map((s) => <option key={s.id} value={s.id}>{s.dayLabel} {s.dateLabel}{s.archivedAt ? ' (archived)' : ''}</option>)}
        </select>
        <select name="status" defaultValue={f.status} className={input} aria-label="Status">
          {['paid', 'pending', 'failed', 'expired', 'all'].map((s) => <option key={s} value={s}>{s === 'all' ? 'Any status' : s}</option>)}
        </select>
        <select name="watched" defaultValue={f.watched ?? ''} className={input} aria-label="Watched full">
          <option value="">Watched: any</option><option value="yes">Watched full</option><option value="no">Not watched</option>
        </select>
        {r.key !== 'all' && <><input type="hidden" name="from" value={r.from ?? ''} /><input type="hidden" name="to" value={r.to ?? ''} />{r.from ? null : <input type="hidden" name="range" value={r.key} />}</>}
        <button className={btn}>Apply filters</button>
      </form>
      <div className="mb-4"><RangePicker base="/admin/buyers" current={r} sp={sp} /></div>

      {rows.length === 0 ? <Empty>No orders match these filters.</Empty> : (
        <TableBox>
          <table className="w-full">
            <thead><tr>{['Name', 'Phone', 'Email', 'Slot', 'Amount', 'Status', 'Payment ID', 'Method', 'Source', 'Paid at', 'Watched', 'Bonus'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className={td}><Link className="font-medium text-brand hover:underline" href={`/admin/buyers/${o.id}`}>{o.name}</Link></td>
                  <td className={td}>{o.phone}</td><td className={td}>{o.email}</td><td className={td}>{o.slotLabel}</td>
                  <td className={td}>{formatINR(o.amountPaise)}</td><td className={td}><StatusBadge status={o.status} /></td>
                  <td className={`${td} font-mono text-xs`}>{o.paymentId ?? '—'}</td><td className={td}>{o.method ?? '—'}</td>
                  <td className={td}>{o.utmContent || o.utmSource || '(direct)'}</td><td className={td}>{fmtDateTime(o.paidAt ?? o.createdAt)}</td>
                  <td className={td}>{o.watchedFull ? <Badge tone="good">Yes</Badge> : '—'}</td><td className={td}>{o.bonusGiven ? <Badge tone="brand">Given</Badge> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}
      <Pagination base="/admin/buyers" sp={sp} page={page} total={total} pageSize={PAGE_SIZE} />
    </>
  );
}
