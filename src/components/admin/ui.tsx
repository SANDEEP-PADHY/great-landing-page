// Small hand-made UI kit for the admin panel (server-compatible, no hooks). [WS3]
import Link from 'next/link';
import type { ReactNode } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
export const btnDanger = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors';
export const input = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
export const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, right, children, className }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-line bg-white shadow-sm', className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label: l, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{l}</div>
      <div className={cx('mt-1 text-2xl font-bold tracking-tight tabular-nums', tone === 'good' && 'text-emerald-700', tone === 'bad' && 'text-red-700')}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

const badgeTone = {
  neutral: 'bg-slate-100 text-slate-700',
  good: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-800',
  bad: 'bg-red-50 text-red-700',
  brand: 'bg-brand-soft text-brand',
};
export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof badgeTone; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', badgeTone[tone])}>{children}</span>;
}
export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'paid' || status === 'sent' ? 'good' : status === 'pending' || status === 'queued' ? 'warn' : status === 'failed' ? 'bad' : 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}

/** Scrolls horizontally inside its own box so the page itself never overflows on phones. */
export function TableBox({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">{children}</div>;
}
export const th = 'whitespace-nowrap border-b border-line bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted';
export const td = 'whitespace-nowrap border-b border-line/70 px-3 py-2.5 text-sm';

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">{children}</div>;
}

export function Field({ label: l, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={label}>{l}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

type SP = Record<string, string | string[] | undefined>;
export function hrefWith(base: string, sp: SP, patch: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined && val !== '') q.set(k, val);
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export function Pagination({ base, sp, page, total, pageSize }: { base: string; sp: SP; page: number; total: number; pageSize: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted">
      <span>{total.toLocaleString('en-IN')} results · page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link className={btn} href={hrefWith(base, sp, { page: String(page - 1) })}>← Prev</Link>}
        {page < pages && <Link className={btn} href={hrefWith(base, sp, { page: String(page + 1) })}>Next →</Link>}
      </div>
    </div>
  );
}

/** Date-range picker: plain links plus a GET form, so it needs no client JS. */
export function RangePicker({ base, current, sp }: { base: string; current: { key: string; from?: string; to?: string }; sp: SP }) {
  const presets = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['all', 'All time']] as const;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex overflow-hidden rounded-lg border border-line bg-white text-sm">
        {presets.map(([k, l]) => (
          <Link key={k} href={hrefWith(base, sp, { range: k, from: undefined, to: undefined, page: undefined })}
            className={cx('px-3 py-2 font-medium', current.key === k ? 'bg-brand text-white' : 'hover:bg-slate-50')}>{l}</Link>
        ))}
      </div>
      <form action={base} method="get" className="flex items-center gap-1.5">
        {Object.entries(sp).filter(([k]) => !['range', 'from', 'to', 'page'].includes(k)).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={Array.isArray(v) ? v[0] : v ?? ''} />
        ))}
        <input type="date" name="from" defaultValue={current.from} className={cx(input, 'w-auto')} aria-label="From date" />
        <span className="text-muted">→</span>
        <input type="date" name="to" defaultValue={current.to} className={cx(input, 'w-auto')} aria-label="To date" />
        <button className={cx(btn, current.key === 'custom' && 'border-brand text-brand')}>Apply</button>
      </form>
    </div>
  );
}

export function Flash({ sp }: { sp: SP }) {
  const msg = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;
  if (!msg) return null;
  return <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg === '1' ? 'Saved.' : msg}</div>;
}
