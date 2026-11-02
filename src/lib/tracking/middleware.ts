import { NextResponse, type NextRequest } from 'next/server';

import { COOKIE, type Attribution } from './attribution';

const DAY = 86_400;
const base = { path: '/', sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', httpOnly: false };

const SKIP = /^\/(_next|uploads|api|admin|favicon|robots|sitemap)/;

/** Page-request middleware (edge-safe; imported by src/middleware.ts via ./middleware): visitor id, last-touch attribution, fbc/fbp. Never on /admin or /api. */
export function trackingMiddleware(req: NextRequest, res: NextResponse): NextResponse {
  const { pathname, searchParams } = req.nextUrl;
  if (SKIP.test(pathname) || /\.[a-z0-9]{2,5}$/i.test(pathname)) return res;

  if (!req.cookies.get(COOKIE.vid)) {
    res.cookies.set(COOKIE.vid, crypto.randomUUID(), { ...base, maxAge: 400 * DAY });
  }

  const now = Date.now();
  const fbclid = searchParams.get('fbclid');
  const utm: Attribution = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const v = searchParams.get(k);
    if (v) utm[k] = v.slice(0, 200);
  }
  if (fbclid || Object.keys(utm).length) {
    const ref = req.headers.get('referer');
    const attr: Attribution = {
      ...utm,
      ...(fbclid ? { fbclid: fbclid.slice(0, 300) } : {}),
      ...(ref ? { referrer: ref.slice(0, 300) } : {}),
      landing_url: (req.nextUrl.origin + pathname).slice(0, 300),
      ts: now,
    };
    res.cookies.set(COOKIE.attr, JSON.stringify(attr), { ...base, maxAge: 30 * DAY });
  }
  if (fbclid) {
    res.cookies.set(COOKIE.fbc, `fb.1.${now}.${fbclid}`, { ...base, maxAge: 90 * DAY });
  }
  if (!req.cookies.get(COOKIE.fbp)) {
    const rnd = String(Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000);
    res.cookies.set(COOKIE.fbp, `fb.1.${now}.${rnd}`, { ...base, maxAge: 90 * DAY });
  }
  return res;
}

