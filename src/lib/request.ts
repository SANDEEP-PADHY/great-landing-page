export function clientIp(h: Headers): string | null {
  const cf = h.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  return h.get('x-real-ip')?.trim() || null;
}
export function userAgent(h: Headers): string | null {
  return h.get('user-agent');
}
export function parseCookies(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (h.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
