import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Empty, PageHeader, RangePicker, Stat, TableBox, td, th } from '@/components/admin/ui';
import { LiveNow } from '@/components/admin/LiveNow';
import { RevenueChart, SimpleBars } from '@/components/admin/Charts';
import { getCampaignTable, getDailySeries, getFunnel, getKpis, getLiveVisitors, getSalesBySlot } from '@/lib/analytics/queries';
import { recentSales } from '@/lib/admin/data';
import { resolveRange, timeAgo } from '@/lib/admin/time';
import { formatINR } from '@/lib/pricing';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const STEP_LABEL: Record<string, string> = {
  page_view: 'Page view', cta_click: 'CTA click', checkout_open: 'Checkout opened', lead_submit: 'Lead submitted', payment_open: 'Payment opened', purchase: 'Purchase',
};
const pct = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const r = resolveRange(sp, '7d');
  const [kpis, series, funnel, bySlot, campaigns, live, sales] = await Promise.all([
    getKpis(r.range), getDailySeries(r.range), getFunnel(r.range), getSalesBySlot(r.range), getCampaignTable(r.range), getLiveVisitors(5), recentSales(10),
  ]);
  const top = Math.max(1, ...funnel.map((f) => f.visitors));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${r.label} · all times IST`} actions={<RangePicker base="/admin" current={r} sp={sp} />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue" value={formatINR(kpis.revenuePaise)} hint={r.label} />
        <Stat label="Sales" value={kpis.sales} hint={r.label} />
        <Stat label="Revenue today" value={formatINR(kpis.revenueTodayPaise)} />
        <Stat label="Unique visitors" value={kpis.visitors.toLocaleString('en-IN')} />
        <Stat label="Visitor → Purchase" value={pct(kpis.visitorToPurchasePct)} />
        <Stat label="Checkout → Purchase" value={pct(kpis.checkoutToPurchasePct)} />
        <Stat label="Avg sales / day" value={(Math.round(kpis.avgSalesPerDay * 10) / 10).toString()} />
        <Stat label="Abandoned" value={kpis.abandoned} hint="see Abandoned page" tone={kpis.abandoned > 0 ? 'bad' : undefined} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card title="Revenue & sales by day" className="xl:col-span-2">
          <RevenueChart data={series.map((d) => ({ day: d.day, revenue: d.revenuePaise / 100, sales: d.sales }))} />
        </Card>
        <Card title="Live now"><LiveNow initial={live} /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Funnel (unique visitors)">
          {funnel.every((f) => f.visitors === 0) ? <p className="py-6 text-center text-sm text-muted">No tracked visitors yet.</p> : (
            <ol className="space-y-3">
              {funnel.map((f, i) => (
                <li key={f.step}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{STEP_LABEL[f.step] ?? f.step}</span>
                    <span className="tabular-nums text-muted">{f.visitors.toLocaleString('en-IN')}{i > 0 && <span className="ml-2 font-semibold text-slate-700">{pct(f.pctOfPrev)} of previous</span>}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, (f.visitors / top) * 100)}%` }} /></div>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Sales per slot">
          <SimpleBars data={bySlot.map((s) => ({ label: s.label, value: s.sales }))} />
          <ul className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
            {bySlot.map((s) => <li key={s.slotId} className="flex justify-between border-b border-line/60 py-1"><span>{s.label}</span><span className="tabular-nums text-muted">{s.sales} · {formatINR(s.revenuePaise)}</span></li>)}
          </ul>
        </Card>
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold">Campaigns (which ad wins)</h2>
      {campaigns.length === 0 ? <Empty>No campaign data in this range.</Empty> : (
        <TableBox>
          <table className="w-full">
            <thead><tr>{['Source', 'Campaign', 'Content', 'Visitors', 'CTA clicks', 'Checkouts', 'Sales', 'Revenue', 'Conv.'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {[...campaigns].sort((a, b) => b.sales - a.sales || b.visitors - a.visitors).map((c, i) => (
                <tr key={i}>
                  <td className={td}>{c.source || '(direct)'}</td><td className={td}>{c.campaign || '(direct)'}</td><td className={td}>{c.content || '(direct)'}</td>
                  <td className={td}>{c.visitors}</td><td className={td}>{c.ctaClicks}</td><td className={td}>{c.checkouts}</td>
                  <td className={`${td} font-semibold`}>{c.sales}</td><td className={td}>{formatINR(c.revenuePaise)}</td><td className={td}>{pct(c.convPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold">Recent sales</h2>
      {sales.length === 0 ? <Empty>No sales yet.</Empty> : (
        <TableBox>
          <table className="w-full">
            <thead><tr>{['Buyer', 'Slot', 'Amount', 'Ad (utm_content)', 'When'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className={td}><Link className="font-medium text-brand hover:underline" href={`/admin/buyers/${s.id}`}>{s.name}</Link></td>
                  <td className={td}>{s.slotLabel}</td><td className={td}>{formatINR(s.amountPaise)}</td>
                  <td className={td}>{s.utmContent || s.utmSource || '(direct)'}</td><td className={td}>{timeAgo(s.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}
    </>
  );
}
