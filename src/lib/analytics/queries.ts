import 'server-only';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { DateRange, SlotId } from '@/lib/contracts';
import { PIXEL_ID } from '@/lib/tracking/pixel';

/* Analytics library for the admin dashboard.
 * All queries: exclude bots, bucket by IST, unique visitors for funnels, money from `orders` (paid) only. */

const TZ = `'Asia/Kolkata'`;

async function q<T>(query: SQL): Promise<T[]> {
  const res = (await db.execute(query)) as unknown;
  const rows = Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? []);
  return rows as T[];
}
const n = (v: unknown) => Number(v ?? 0);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const evWhere = (r: DateRange) => sql`e.is_bot = false and e.occurred_at >= ${r.from.toISOString()}::timestamptz and e.occurred_at < ${r.to.toISOString()}::timestamptz`;
const paidWhere = (r: DateRange) => sql`o.status = 'paid' and o.paid_at >= ${r.from.toISOString()}::timestamptz and o.paid_at < ${r.to.toISOString()}::timestamptz`;

function days(r: DateRange): number {
  return Math.max(1, Math.round((r.to.getTime() - r.from.getTime()) / 86_400_000));
}

export type EventRow = {
  id: number; eventId: string; name: string; source: string; visitorId: string | null; sessionId: string | null;
  orderId: string | null; path: string | null; props: Record<string, unknown> | null;
  utmSource: string | null; utmCampaign: string | null; utmContent: string | null; device: string | null;
  isBot: boolean; occurredAt: string;
};
const mapEvent = (r: Record<string, unknown>): EventRow => ({
  id: n(r.id), eventId: String(r.event_id), name: String(r.name), source: String(r.source),
  visitorId: (r.visitor_id as string) ?? null, sessionId: (r.session_id as string) ?? null,
  orderId: (r.order_id as string) ?? null, path: (r.path as string) ?? null,
  props: (r.props as Record<string, unknown>) ?? null,
  utmSource: (r.utm_source as string) ?? null, utmCampaign: (r.utm_campaign as string) ?? null,
  utmContent: (r.utm_content as string) ?? null, device: (r.device as string) ?? null,
  isBot: Boolean(r.is_bot), occurredAt: new Date(r.occurred_at as string).toISOString(),
});

/* ---------- headline ---------- */

export async function getKpis(r: DateRange) {
  const [paid] = await q<{ sales: string; revenue: string }>(sql`
    select count(*) sales, coalesce(sum(o.amount_paise),0) revenue from orders o where ${paidWhere(r)}`);
  const [today] = await q<{ revenue: string }>(sql`
    select coalesce(sum(o.amount_paise),0) revenue from orders o
    where o.status='paid' and (o.paid_at at time zone ${sql.raw(TZ)})::date = (now() at time zone ${sql.raw(TZ)})::date`);
  const [v] = await q<{ visitors: string; checkouts: string }>(sql`
    select count(distinct e.visitor_id) filter (where e.name='page_view') visitors,
           count(distinct e.visitor_id) filter (where e.name='checkout_open') checkouts
    from events e where ${evWhere(r)}`);
  const [ab] = await q<{ c: string }>(sql`
    select count(*) c from orders o
    where o.status='pending' and o.created_at >= ${r.from.toISOString()}::timestamptz and o.created_at < ${r.to.toISOString()}::timestamptz
      and o.created_at < now() - interval '15 minutes'
      and not exists (select 1 from orders p where p.customer_id=o.customer_id and p.status='paid')`);
  const sales = n(paid?.sales);
  const visitors = n(v?.visitors);
  return {
    revenuePaise: n(paid?.revenue),
    sales,
    revenueTodayPaise: n(today?.revenue),
    visitors,
    visitorToPurchasePct: pct(sales, visitors),
    checkoutToPurchasePct: pct(sales, n(v?.checkouts)),
    avgSalesPerDay: Math.round((sales / days(r)) * 10) / 10,
    abandoned: n(ab?.c),
  };
}

export async function getDailySeries(r: DateRange) {
  const rows = await q<{ day: string; revenue: string; sales: string; visitors: string }>(sql`
    with d as (select generate_series(
        (${r.from.toISOString()}::timestamptz at time zone ${sql.raw(TZ)})::date,
        ((${r.to.toISOString()}::timestamptz - interval '1 second') at time zone ${sql.raw(TZ)})::date, interval '1 day')::date as day),
    s as (select (o.paid_at at time zone ${sql.raw(TZ)})::date as day, count(*) sales, sum(o.amount_paise) revenue
          from orders o where ${paidWhere(r)} group by 1),
    v as (select (e.occurred_at at time zone ${sql.raw(TZ)})::date as day, count(distinct e.visitor_id) visitors
          from events e where ${evWhere(r)} and e.name='page_view' group by 1)
    select to_char(d.day,'YYYY-MM-DD') as day, coalesce(s.revenue,0) revenue, coalesce(s.sales,0) sales, coalesce(v.visitors,0) visitors
    from d left join s using(day) left join v using(day) order by d.day`);
  return rows.map((x) => ({ day: x.day, revenuePaise: n(x.revenue), sales: n(x.sales), visitors: n(x.visitors) }));
}

const FUNNEL_STEPS = ['page_view', 'cta_click', 'checkout_open', 'lead_submit', 'payment_open', 'purchase'] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export async function getFunnel(r: DateRange): Promise<{ step: FunnelStep; visitors: number; pctOfPrev: number }[]> {
  const rows = await q<{ name: string; v: string }>(sql`
    select e.name, count(distinct e.visitor_id) v from events e
    where ${evWhere(r)} and e.name in ('page_view','cta_click','checkout_open','lead_submit','payment_open') group by e.name`);
  const [p] = await q<{ v: string }>(sql`
    select count(distinct coalesce(o.visitor_id, o.id::text)) v from orders o where ${paidWhere(r)}`);
  const map = new Map(rows.map((x) => [x.name, n(x.v)]));
  map.set('purchase', n(p?.v));
  let prev = 0;
  return FUNNEL_STEPS.map((step, i) => {
    const visitors = map.get(step) ?? 0;
    const out = { step, visitors, pctOfPrev: i === 0 ? 100 : pct(visitors, prev) };
    prev = visitors;
    return out;
  });
}

export async function getSalesBySlot(r: DateRange): Promise<{ slotId: SlotId; label: string; sales: number; revenuePaise: number }[]> {
  const rows = await q<{ id: string; day_label: string; date_label: string; sales: string; revenue: string }>(sql`
    select s.id, s.day_label, s.date_label, count(o.id) sales, coalesce(sum(o.amount_paise),0) revenue
    from slots s left join orders o on o.slot_id=s.id and ${paidWhere(r)}
    group by s.id, s.day_label, s.date_label, s.sort, s.starts_at order by s.starts_at`);
  return rows.map((x) => ({ slotId: x.id as SlotId, label: `${x.day_label} ${x.date_label}`, sales: n(x.sales), revenuePaise: n(x.revenue) }));
}

export async function getCampaignTable(r: DateRange) {
  const rows = await q<Record<string, unknown>>(sql`
    with v as (
      select coalesce(e.utm_source,'(direct)') source, coalesce(e.utm_campaign,'(none)') campaign, coalesce(e.utm_content,'(none)') content,
        count(distinct e.visitor_id) filter (where e.name='page_view') visitors,
        count(distinct e.visitor_id) filter (where e.name='cta_click') cta,
        count(distinct e.visitor_id) filter (where e.name='checkout_open') checkouts
      from events e where ${evWhere(r)} group by 1,2,3),
    s as (
      select coalesce(o.utm_source,'(direct)') source, coalesce(o.utm_campaign,'(none)') campaign, coalesce(o.utm_content,'(none)') content,
        count(*) sales, sum(o.amount_paise) revenue
      from orders o where ${paidWhere(r)} group by 1,2,3)
    select coalesce(v.source,s.source) source, coalesce(v.campaign,s.campaign) campaign, coalesce(v.content,s.content) content,
      coalesce(v.visitors,0) visitors, coalesce(v.cta,0) cta, coalesce(v.checkouts,0) checkouts,
      coalesce(s.sales,0) sales, coalesce(s.revenue,0) revenue
    from v full join s on v.source=s.source and v.campaign=s.campaign and v.content=s.content
    order by revenue desc, visitors desc limit 200`);
  return rows.map((x) => ({
    source: String(x.source), campaign: String(x.campaign), content: String(x.content),
    visitors: n(x.visitors), ctaClicks: n(x.cta), checkouts: n(x.checkouts), sales: n(x.sales), revenuePaise: n(x.revenue),
    convPct: pct(n(x.sales), n(x.visitors)),
  }));
}

export async function getLiveVisitors(minutes = 5) {
  const [c] = await q<{ c: string }>(sql`
    select count(distinct e.visitor_id) c from events e
    where e.is_bot=false and e.occurred_at >= now() - make_interval(mins => ${minutes})`);
  const recent = await q<{ name: string; path: string | null; at: string }>(sql`
    select e.name, e.path, e.occurred_at at from events e
    where e.is_bot=false and e.occurred_at >= now() - make_interval(mins => ${minutes})
      and e.name not in ('web_vital','engaged_time','section_time','scroll_depth','client_error')
    order by e.occurred_at desc limit 15`);
  return { count: n(c?.c), recent: recent.map((x) => ({ name: x.name, path: x.path ?? '/', at: new Date(x.at).toISOString() })) };
}

/* ---------- audience ---------- */

export async function getTrafficSources(r: DateRange) {
  const rows = await q<{ source: string; medium: string; visitors: string }>(sql`
    select coalesce(e.utm_source, case when e.props->>'referrer' is null then '(direct)' else regexp_replace(e.props->>'referrer','^https?://([^/]+).*$','\\1') end) source,
           '' medium, count(distinct e.visitor_id) visitors
    from events e where ${evWhere(r)} and e.name='page_view' group by 1 order by visitors desc limit 25`);
  return rows.map((x) => ({ source: x.source, visitors: n(x.visitors) }));
}

async function visitorSplit(r: DateRange, col: 'device' | 'country' | 'os' | 'browser') {
  const c = sql.raw(`v.${col}`);
  const rows = await q<{ k: string; visitors: string }>(sql`
    select coalesce(${c},'unknown') k, count(distinct e.visitor_id) visitors
    from events e join visitors v on v.id=e.visitor_id
    where ${evWhere(r)} and e.name='page_view' group by 1 order by visitors desc limit 20`);
  return rows.map((x) => ({ key: x.k, visitors: n(x.visitors) }));
}
export const getDeviceSplit = (r: DateRange) => visitorSplit(r, 'device');
export const getCountrySplit = (r: DateRange) => visitorSplit(r, 'country');
export const getOsSplit = (r: DateRange) => visitorSplit(r, 'os');
export const getBrowserSplit = (r: DateRange) => visitorSplit(r, 'browser');

/* ---------- page behaviour ---------- */

export async function getScrollDepth(r: DateRange) {
  const [base] = await q<{ v: string }>(sql`select count(distinct e.visitor_id) v from events e where ${evWhere(r)} and e.name='page_view'`);
  const rows = await q<{ p: string; v: string }>(sql`
    select (e.props->>'percent') p, count(distinct e.visitor_id) v from events e
    where ${evWhere(r)} and e.name='scroll_depth' group by 1`);
  const total = n(base?.v);
  const map = new Map(rows.map((x) => [Number(x.p), n(x.v)]));
  return [25, 50, 75, 90, 100].map((percent) => ({ percent, visitors: map.get(percent) ?? 0, pctOfVisitors: pct(map.get(percent) ?? 0, total) }));
}

export async function getSectionEngagement(r: DateRange) {
  const views = await q<{ s: string; idx: string; v: string }>(sql`
    select e.props->>'section' s, min((e.props->>'index')::int) idx, count(distinct e.visitor_id) v
    from events e where ${evWhere(r)} and e.name='section_view' group by 1`);
  const time = await q<{ s: string; avg_ms: string }>(sql`
    select k s, avg(v::numeric) avg_ms from events e, jsonb_each_text(e.props->'sections') as t(k, v)
    where ${evWhere(r)} and e.name='section_time' group by k`);
  const t = new Map(time.map((x) => [x.s, n(x.avg_ms)]));
  return views
    .map((x) => ({ section: x.s, index: n(x.idx), visitors: n(x.v), avgSeconds: Math.round(((t.get(x.s) ?? 0) / 1000) * 10) / 10 }))
    .sort((a, b) => a.index - b.index);
}

export async function getCtaByLocation(r: DateRange) {
  const rows = await q<{ loc: string; clicks: string; v: string }>(sql`
    select coalesce(e.props->>'location','unknown') loc, count(*) clicks, count(distinct e.visitor_id) v
    from events e where ${evWhere(r)} and e.name='cta_click' group by 1 order by clicks desc`);
  return rows.map((x) => ({ location: x.loc, clicks: n(x.clicks), visitors: n(x.v) }));
}

export async function getFaqOpens(r: DateRange) {
  const rows = await q<{ idx: string; question: string | null; opens: string; v: string }>(sql`
    select e.props->>'index' idx, max(e.props->>'question') question, count(*) opens, count(distinct e.visitor_id) v
    from events e where ${evWhere(r)} and e.name='faq_open' group by 1 order by opens desc`);
  return rows.map((x) => ({ index: n(x.idx), question: x.question ?? '', opens: n(x.opens), visitors: n(x.v) }));
}

export async function getFormDropoff(r: DateRange) {
  const steps = await q<{ name: string; k: string | null; v: string }>(sql`
    select e.name, e.props->>'field' k, count(distinct e.visitor_id) v from events e
    where ${evWhere(r)} and e.name in ('checkout_open','form_field_complete','lead_submit','checkout_close') group by 1,2`);
  const errors = await q<{ field: string | null; code: string | null; c: string }>(sql`
    select e.props->>'field' field, e.props->>'code' code, count(*) c from events e
    where ${evWhere(r)} and e.name='form_error' group by 1,2 order by c desc limit 20`);
  const get = (name: string, k?: string) => n(steps.find((s) => s.name === name && (k ? s.k === k : true))?.v);
  return {
    opened: get('checkout_open'),
    completed: { name: get('form_field_complete', 'name'), phone: get('form_field_complete', 'phone'), email: get('form_field_complete', 'email') },
    submitted: get('lead_submit'),
    closedWithoutSubmit: get('checkout_close'),
    errors: errors.map((x) => ({ field: x.field ?? '', code: x.code ?? '', count: n(x.c) })),
  };
}

export async function getPaymentOutcomes(r: DateRange) {
  const ev = await q<{ name: string; c: string }>(sql`
    select e.name, count(*) c from events e
    where ${evWhere(r)} and e.name in ('payment_open','payment_dismissed','payment_failed') group by 1`);
  const fails = await q<{ reason: string; c: string }>(sql`
    select coalesce(e.props->>'reason', e.props->>'code','unknown') reason, count(*) c from events e
    where ${evWhere(r)} and e.name='payment_failed' group by 1 order by c desc limit 10`);
  const methods = await q<{ m: string; c: string }>(sql`
    select coalesce(o.payment_method,'unknown') m, count(*) c from orders o where ${paidWhere(r)} group by 1 order by c desc`);
  const g = (k: string) => n(ev.find((x) => x.name === k)?.c);
  return {
    opened: g('payment_open'), dismissed: g('payment_dismissed'), failed: g('payment_failed'),
    failureReasons: fails.map((x) => ({ reason: x.reason, count: n(x.c) })),
    paidByMethod: methods.map((x) => ({ method: x.m, count: n(x.c) })),
  };
}

export async function getEngagement(r: DateRange) {
  const [x] = await q<Record<string, unknown>>(sql`
    with per as (
      select e.visitor_id, max((e.props->>'seconds_total')::int) secs from events e
      where ${evWhere(r)} and e.name='engaged_time' group by 1)
    select count(*) visitors, coalesce(avg(secs),0) avg_secs,
           count(*) filter (where secs>=30) s30, count(*) filter (where secs>=120) s120 from per`);
  const [s] = await q<{ sessions: string; pages: string }>(sql`
    select count(distinct e.session_id) sessions, count(*) filter (where e.name='page_view') pages
    from events e where ${evWhere(r)}`);
  return {
    engagedVisitors: n(x?.visitors), avgEngagedSeconds: Math.round(n(x?.avg_secs)),
    reached30s: n(x?.s30), reached120s: n(x?.s120),
    sessions: n(s?.sessions), pagesPerSession: n(s?.sessions) ? Math.round((n(s?.pages) / n(s?.sessions)) * 10) / 10 : 0,
  };
}

/** 7 x 24 grid (Sun=0 … Sat=6, hour in IST) of unique page-view visitors. */
export async function getHourlyHeatmap(r: DateRange) {
  const rows = await q<{ dow: string; hr: string; v: string }>(sql`
    select extract(dow from e.occurred_at at time zone ${sql.raw(TZ)}) dow, extract(hour from e.occurred_at at time zone ${sql.raw(TZ)}) hr,
           count(distinct e.visitor_id) v
    from events e where ${evWhere(r)} and e.name='page_view' group by 1,2`);
  return rows.map((x) => ({ dow: n(x.dow), hour: n(x.hr), visitors: n(x.v) }));
}

export async function getWebVitals(r: DateRange) {
  const rows = await q<Record<string, unknown>>(sql`
    select e.props->>'metric' metric, count(*) samples,
      percentile_cont(0.75) within group (order by (e.props->>'value')::float) p75,
      count(*) filter (where e.props->>'rating'='good') good,
      count(*) filter (where e.props->>'rating'='poor') poor
    from events e where ${evWhere(r)} and e.name='web_vital' group by 1 order by 1`);
  return rows.map((x) => ({ metric: String(x.metric), samples: n(x.samples), p75: Math.round(n(x.p75) * 1000) / 1000, goodPct: pct(n(x.good), n(x.samples)), poorPct: pct(n(x.poor), n(x.samples)) }));
}

/* ---------- raw explorer ---------- */

export async function listEvents(f: { name?: string; visitorId?: string; range: DateRange; page: number }) {
  const size = 50;
  const where = sql`e.occurred_at >= ${f.range.from.toISOString()}::timestamptz and e.occurred_at < ${f.range.to.toISOString()}::timestamptz
    ${f.name ? sql`and e.name = ${f.name}` : sql``} ${f.visitorId ? sql`and e.visitor_id = ${f.visitorId}` : sql``}`;
  const [t] = await q<{ c: string }>(sql`select count(*) c from events e where ${where}`);
  const rows = await q<Record<string, unknown>>(sql`
    select e.* from events e where ${where} order by e.occurred_at desc, e.id desc
    limit ${size} offset ${Math.max(0, f.page) * size}`);
  return { rows: rows.map(mapEvent), total: n(t?.c) };
}

export async function getVisitorJourney(visitorId: string): Promise<EventRow[]> {
  const rows = await q<Record<string, unknown>>(sql`
    select e.* from events e where e.visitor_id = ${visitorId} order by e.occurred_at asc, e.id asc limit 1000`);
  return rows.map(mapEvent);
}

/* ---------- Meta health ---------- */

export async function getCapiHealth() {
  const [c] = await q<Record<string, unknown>>(sql`
    select count(*) filter (where status='sent' and sent_at >= now() - interval '24 hours') sent24,
           count(*) filter (where status='pending') pending,
           count(*) filter (where status='failed' and created_at >= now() - interval '24 hours') failed24
    from capi_outbox`);
  const [last] = await q<{ last_error: string; fbtrace_id: string | null; at: string }>(sql`
    select last_error, fbtrace_id, coalesce(sent_at, next_attempt_at, created_at) at from capi_outbox
    where last_error is not null order by id desc limit 1`);
  // Browser events that also have a server twin (same event_id means one row, so count outbox rows whose id also fired in the Pixel).
  const [d] = await q<{ c: string }>(sql`
    select count(*) c from capi_outbox c join events e on e.event_id = c.event_id and e.source='browser'
    where c.status='sent' and c.sent_at >= now() - interval '24 hours'`);
  return {
    pixelId: PIXEL_ID,
    sent24h: n(c?.sent24), pending: n(c?.pending), failed24h: n(c?.failed24),
    ...(last ? { lastError: { message: last.last_error, fbtraceId: last.fbtrace_id ?? undefined, at: new Date(last.at).toISOString() } } : {}),
    dedupPairs24h: n(d?.c),
  };
}
