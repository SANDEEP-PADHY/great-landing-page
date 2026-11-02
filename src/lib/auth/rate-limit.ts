import 'server-only';

// In-memory limiter: fine because there is a single web process (PM2 fork mode, 1 instance).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const fails = new Map<string, { count: number; first: number }>();

function live(ip: string) {
  const e = fails.get(ip);
  if (e && Date.now() - e.first > WINDOW_MS) {
    fails.delete(ip);
    return undefined;
  }
  return e;
}

/** Returns minutes to wait, or 0 when the IP may try. */
export function loginWaitMinutes(ip: string): number {
  const e = live(ip);
  if (!e || e.count < MAX_FAILS) return 0;
  return Math.max(1, Math.ceil((e.first + WINDOW_MS - Date.now()) / 60000));
}

export function recordLoginFailure(ip: string): void {
  const e = live(ip);
  if (e) e.count += 1;
  else fails.set(ip, { count: 1, first: Date.now() });
}

export function clearLoginFailures(ip: string): void {
  fails.delete(ip);
}
