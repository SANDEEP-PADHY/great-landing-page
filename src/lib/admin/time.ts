// Time helpers. IST is a fixed +05:30 offset (no DST). Safe to import from client code.
import type { DateRange } from '@/lib/contracts';

export const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY = 86_400_000;

export function startOfIstDay(d: Date): Date {
  const t = d.getTime() + IST_OFFSET_MS;
  return new Date(Math.floor(t / DAY) * DAY - IST_OFFSET_MS);
}

const dtf = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
});
const dtfYear = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
});

export function fmtDateTime(v: Date | string | null | undefined, withYear = false): string {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '—';
  return (withYear ? dtfYear : dtf).format(d);
}

export function timeAgo(v: Date | string | null | undefined): string {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** ISO string → value for <input type="datetime-local"> in IST. */
export function toIstInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value (IST) → ISO with +05:30. */
export function fromIstInput(v: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?$/.exec(v);
  if (!m) return null;
  const iso = `${m[1]}${m[2] ?? ':00'}+05:30`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

export type RangeKey = 'today' | 'yesterday' | '7d' | 'all' | 'custom';
export const RANGE_LABELS: Record<Exclude<RangeKey, 'custom'>, string> = {
  today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 days', all: 'All time',
};

type Params = Record<string, string | string[] | undefined>;
export const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

export type ResolvedRange = { key: RangeKey; label: string; range: DateRange; from?: string; to?: string };

export function resolveRange(sp: Params, fallback: Exclude<RangeKey, 'custom'> = '7d', now = new Date()): ResolvedRange {
  const todayStart = startOfIstDay(now);
  const from = first(sp.from);
  const to = first(sp.to);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const f = new Date(`${from}T00:00:00+05:30`);
    const tt = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T00:00:00+05:30`) : todayStart;
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(tt.getTime())) {
      return { key: 'custom', label: `${from} → ${to ?? 'today'}`, from, to: to ?? undefined, range: { from: f, to: new Date(tt.getTime() + DAY - 1) } };
    }
  }
  const raw = first(sp.range);
  const key = (raw === 'today' || raw === 'yesterday' || raw === '7d' || raw === 'all' ? raw : fallback) as Exclude<RangeKey, 'custom'>;
  const endOfToday = new Date(todayStart.getTime() + DAY - 1);
  switch (key) {
    case 'today': return { key, label: RANGE_LABELS[key], range: { from: todayStart, to: endOfToday } };
    case 'yesterday': return { key, label: RANGE_LABELS[key], range: { from: new Date(todayStart.getTime() - DAY), to: new Date(todayStart.getTime() - 1) } };
    case '7d': return { key, label: RANGE_LABELS[key], range: { from: new Date(todayStart.getTime() - 6 * DAY), to: endOfToday } };
    default: return { key: 'all', label: RANGE_LABELS.all, range: { from: new Date('2020-01-01T00:00:00Z'), to: endOfToday } };
  }
}
