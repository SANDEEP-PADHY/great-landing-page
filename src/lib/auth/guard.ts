// Called from src/middleware.ts for /admin/* and /api/admin/*. Edge-safe. [WS3]
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from './token';

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

/** Returns a response when the request is an admin path (redirect/401/pass with noindex), else undefined. */
export async function adminGuard(req: NextRequest): Promise<NextResponse | undefined> {
  const { pathname } = req.nextUrl;
  if (!isAdminPath(pathname)) return undefined;

  const isApi = pathname.startsWith('/api/');
  const isLogin = pathname === '/admin/login';
  const ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);

  let res: NextResponse;
  if (ok || isLogin) {
    res = NextResponse.next();
  } else if (isApi) {
    res = NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  } else {
    res = NextResponse.redirect(new URL('/admin/login', req.url));
  }
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}
