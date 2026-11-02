import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { Empty, PageHeader, Pagination, StatusBadge, TableBox, btn, input, td, th } from '@/components/admin/ui';
import { PAGE_SIZE, listEmails } from '@/lib/admin/data';
import { first, fmtDateTime } from '@/lib/admin/time';
import { retryEmailAction } from './actions';

export const metadata: Metadata = { title: 'Emails' };
export const dynamic = 'force-dynamic';

export default async function EmailsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const status = first(sp.status);
  const { rows, total } = await listEmails(page, status);
  return (
    <>
      <PageHeader title="Emails" subtitle="Every email the system sent or tried to send." />
      <form method="get" className="mb-3 flex gap-2">
        <select name="status" defaultValue={status ?? ''} className={`${input} w-auto`} aria-label="Status">
          <option value="">All</option><option value="sent">Sent</option><option value="queued">Queued</option><option value="failed">Failed</option>
        </select>
        <button className={btn}>Filter</button>
      </form>
      {rows.length === 0 ? <Empty>No emails yet.</Empty> : (
        <TableBox>
          <table className="w-full">
            <thead><tr>{['Time', 'To', 'Template', 'Status', 'Attempts', 'Error', 'Order', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(({ log, publicId }) => (
                <tr key={log.id}>
                  <td className={td}>{fmtDateTime(log.createdAt)}</td><td className={td}>{log.to}</td><td className={td}>{log.template}</td>
                  <td className={td}><StatusBadge status={log.status} /></td><td className={td}>{log.attempts}</td>
                  <td className="max-w-xs truncate border-b border-line/70 px-3 py-2.5 text-sm text-red-700" title={log.error ?? ''}>{log.error ?? ''}</td>
                  <td className={td}>{log.orderId ? <Link className="text-brand hover:underline" href={`/admin/buyers/${log.orderId}`}>{publicId}</Link> : '—'}</td>
                  <td className={td}>{log.status === 'failed' && <ActionForm action={retryEmailAction.bind(null, log.id)}><SubmitButton variant="plain" pendingLabel="…" className="!py-1 text-xs">Retry</SubmitButton></ActionForm>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}
      <Pagination base="/admin/emails" sp={sp} page={page} total={total} pageSize={PAGE_SIZE} />
    </>
  );
}
