import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DataView } from '@/components/admin/DataView';
import { Badge, Card, Empty, PageHeader, Pagination, RangePicker, TableBox, btn, input, td, th } from '@/components/admin/ui';
import {
  getCtaByLocation, getDeviceSplit, getCountrySplit, getEngagement, getFaqOpens, getFormDropoff, getHourlyHeatmap, getPaymentOutcomes,
  getScrollDepth, getSectionEngagement, getTrafficSources, getWebVitals, listEvents,
} from '@/lib/analytics/queries';
import { first, fmtDateTime, resolveRange } from '@/lib/admin/time';

export const metadata: Metadata = { title: 'Analytics' };
export const dynamic = 'force-dynamic';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Card title={title}>{children}</Card>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const r = resolveRange(sp, '7d');
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const evName = first(sp.name)?.trim() || undefined;
  const evVisitor = first(sp.visitor)?.trim() || undefined;

  const [traffic, device, country, scroll, sections, cta, faq, form, pay, engage, heat, vitals, events] = await Promise.all([
    getTrafficSources(r.range), getDeviceSplit(r.range), getCountrySplit(r.range), getScrollDepth(r.range), getSectionEngagement(r.range),
    getCtaByLocation(r.range), getFaqOpens(r.range), getFormDropoff(r.range), getPaymentOutcomes(r.range), getEngagement(r.range),
    getHourlyHeatmap(r.range), getWebVitals(r.range), listEvents({ name: evName, visitorId: evVisitor, range: r.range, page }),
  ]);

  return (
    <>
      <PageHeader title="Analytics" subtitle={`${r.label} · every tracked user action · IST`} actions={<RangePicker base="/admin/analytics" current={r} sp={sp} />} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Traffic sources"><DataView data={traffic} /></Section>
        <Section title="Device / OS / browser"><DataView data={device} /></Section>
        <Section title="Country"><DataView data={country} /></Section>
        <Section title="Engagement (time on page)"><DataView data={engage} /></Section>
        <Section title="Scroll depth"><DataView data={scroll} /></Section>
        <Section title="Section engagement (page order)"><DataView data={sections} /></Section>
        <Section title="CTA clicks by location"><DataView data={cta} /></Section>
        <Section title="FAQ opens"><DataView data={faq} /></Section>
        <Section title="Checkout form drop-off"><DataView data={form} /></Section>
        <Section title="Payment outcomes"><DataView data={pay} /></Section>
        <Section title="Hourly heatmap (IST)"><DataView data={heat} /></Section>
        <Section title="Web vitals (p75)"><DataView data={vitals} /></Section>
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold">Events explorer</h2>
      <form method="get" className="mb-3 flex flex-wrap gap-2">
        {Object.entries(sp).filter(([k]) => ['range', 'from', 'to'].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={Array.isArray(v) ? v[0] : v ?? ''} />)}
        <input name="name" defaultValue={evName} placeholder="Event name (e.g. cta_click)" className={`${input} max-w-xs`} />
        <input name="visitor" defaultValue={evVisitor} placeholder="Visitor ID" className={`${input} max-w-xs`} />
        <button className={btn}>Filter</button>
      </form>
      {events.rows.length === 0 ? <Empty>No events match.</Empty> : (
        <TableBox>
          <table className="w-full">
            <thead><tr>{['Time', 'Event', 'Source', 'Visitor', 'Page', 'Properties'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {events.rows.map((raw, i) => {
                const e = raw as unknown as Record<string, unknown>;
                const vid = e.visitorId ? String(e.visitorId) : '';
                return (
                  <tr key={String(e.id ?? i)}>
                    <td className={td}>{fmtDateTime(String(e.occurredAt ?? ''))}</td>
                    <td className={td}><Badge tone="brand">{String(e.name ?? '')}</Badge></td>
                    <td className={td}>{String(e.source ?? '')}</td>
                    <td className={`${td} font-mono text-xs`}>{vid ? <Link className="text-brand hover:underline" href={`/admin/analytics?name=&visitor=${encodeURIComponent(vid)}&range=all`}>{vid.slice(0, 8)}…</Link> : '—'}</td>
                    <td className={td}>{String(e.path ?? '')}</td>
                    <td className="max-w-md truncate border-b border-line/70 px-3 py-2.5 font-mono text-xs text-muted" title={e.props ? JSON.stringify(e.props) : ''}>{e.props ? JSON.stringify(e.props) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>
      )}
      <Pagination base="/admin/analytics" sp={sp} page={page} total={events.total} pageSize={50} />
    </>
  );
}
