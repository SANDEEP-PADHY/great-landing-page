// Pure helpers (client + server safe) that turn slot rows into the labels shown on the site.
const IST = 'Asia/Kolkata';

export type SlotTimes = { startsAt: Date | string; endsAt: Date | string };

const fmt = (d: Date | string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { ...o, timeZone: IST }).format(new Date(d));

export function dayLabelIST(startsAt: Date | string): string {
  return fmt(startsAt, { weekday: 'short' });
}
export function dateLabelIST(startsAt: Date | string): string {
  return fmt(startsAt, { day: 'numeric', month: 'short' });
}

/** '7 PM' / '7:30 PM' */
function clock(d: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST }).formatToParts(new Date(d));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const mm = get('minute');
  return `${get('hour')}${mm === '00' ? '' : ':' + mm} ${get('dayPeriod')}`;
}

/** '7–9 PM IST' (or '7 PM – 12 AM IST' when the meridiem differs) */
export function timeRangeIST(s: SlotTimes): string {
  const a = clock(s.startsAt), b = clock(s.endsAt);
  const [ah, ap] = a.split(' ');
  const [, bp] = b.split(' ');
  return ap === bp ? `${ah}–${b} IST` : `${a} – ${b} IST`;
}

/** Day/month parts of an IST date: { d: '7', m: 'Nov' } */
function dm(d: Date | string) {
  return { d: fmt(d, { day: 'numeric' }), m: fmt(d, { month: 'short' }) };
}

/** '7–10 Nov', '7 Nov – 2 Dec', '7 Nov' (single). Input need not be sorted. */
export function dateRangeLabel(slots: { startsAt: Date | string }[]): string {
  const sorted = [...slots].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  if (!sorted.length) return '';
  const f = dm(sorted[0]!.startsAt), l = dm(sorted[sorted.length - 1]!.startsAt);
  if (f.d === l.d && f.m === l.m) return `${f.d} ${f.m}`;
  return f.m === l.m ? `${f.d}–${l.d} ${l.m}` : `${f.d} ${f.m} – ${l.d} ${l.m}`;
}

/** '7, 8, 9 or 10 Nov' (same month) or '7 Nov, 9 Nov or 2 Dec' */
export function dateChoiceLabel(slots: { startsAt: Date | string }[]): string {
  const sorted = [...slots].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)).map((s) => dm(s.startsAt));
  if (!sorted.length) return '';
  if (sorted.length === 1) return `${sorted[0]!.d} ${sorted[0]!.m}`;
  const sameMonth = sorted.every((x) => x.m === sorted[0]!.m);
  const items = sameMonth ? sorted.map((x) => x.d) : sorted.map((x) => `${x.d} ${x.m}`);
  const last = items.pop()!;
  return `${items.join(', ')} or ${last}${sameMonth ? ' ' + sorted[0]!.m : ''}`;
}
