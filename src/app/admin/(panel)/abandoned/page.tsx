import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { Badge, Empty, PageHeader, Pagination, RangePicker, TableBox, btn, btnPrimary, hrefWith, input, td, th } from '@/components/admin/ui';
import { PAGE_SIZE, listOrders, parseOrderFilter } from '@/lib/admin/data';
import { first, fmtDateTime, resolveRange } from '@/lib/admin/time';
import { abandonedMessage, waLink } from '@/lib/admin/whatsapp';
import { markContactedAction } from './actions';

export const metadata: Metadata = { title: 'Abandoned checkouts' };
export const dynamic = 'force-dynamic';

export default async function AbandonedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = parseOrderFilter(sp, 'all');
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const { rows, total } = await listOrders(f, page, { abandoned: true });
  const r = resolveRange(sp, 'all');

  return (
    <>
      <PageHeader title="Abandoned checkouts" subtitle="Leads who submitted the form but never paid (older than 15 minutes). One row per person."
        actions={<a className={btnPrimary} href={hrefWith('/api/admin/export/abandoned', sp, { page: undefined })}>Export CSV</a>} />
      <form method="get" className="mb-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={f.q} placeholder="Search name, phone, email" className={`${input} max-w-xs`} />
        <select name="contacted" defaultValue={f.contacted ?? ''} className={`${input} w-auto`} aria-label="Contacted">
          <option value="">Contacted: any</option><option value="no">Not contacted</option><option value="yes">Contacted</option>
        </select>
        {r.key !== 'all' && (r.from ? <><input type="hidden" name="from" value={r.from} /><input type="hidden" name="to" value={r.to ?? ''} /></> : <input type="hidden" name="range" value={r.key} />)}
        <button className={btn}>Filter</button>
      </form>
      <div className="mb-4"><RangePicker base="/admin/abandoned" current={r} sp={sp} /></div>

      {rows.length === 0 ? <Empty>No abandoned checkouts. Nice.</Empty> : (
        <TableBox>
          <table className="w-full">
            <thead><tr>{['Name', 'Phone', 'Email', 'Slot', 'Created', 'Abandon email', 'Last failure', 'Contacted', 'Actions'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className={td}><Link className="font-medium text-brand hover:underline" href={`/admin/buyers/${o.id}`}>{o.name}</Link></td>
                  <td className={td}>{o.phone}</td><td className={td}>{o.email}</td><td className={td}>{o.slotLabel}</td>
                  <td className={td}>{fmtDateTime(o.createdAt)}</td>
                  <td className={td}>{o.abandonEmailSentAt ? <Badge tone="good">{fmtDateTime(o.abandonEmailSentAt)}</Badge> : '—'}</td>
                  <td className={td}>{o.failure ?? '—'}</td>
                  <td className={td}>{o.contactedAt ? <Badge tone="good">{fmtDateTime(o.contactedAt)}</Badge> : '—'}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <a className={`${btn} !py-1 text-xs`} target="_blank" rel="noreferrer" href={waLink(o.phone, abandonedMessage(o.name, o.slotLabel, o.slotId))}>WhatsApp</a>
                      <ActionForm action={markContactedAction.bind(null, o.id, !o.contactedAt)}>
                        <SubmitButton variant="plain" pendingLabel="…" className="!py-1 text-xs">{o.contactedAt ? 'Undo' : 'Mark contacted'}</SubmitButton>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}
      <Pagination base="/admin/abandoned" sp={sp} page={page} total={total} pageSize={PAGE_SIZE} />
    </>
  );
}
