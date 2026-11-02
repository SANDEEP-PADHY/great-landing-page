import { NextResponse, type NextRequest } from 'next/server';
import { trackingMiddleware } from '@/lib/tracking/middleware';

// WS1 STUB. WS3 implements adminGuard(); WS4 implements trackingMiddleware() in src/lib/tracking/middleware.ts. Keep the two functions separate.
function adminGuard(_req: NextRequest): NextResponse | undefined {
  return undefined;
}

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p.startsWith('/admin') || p.startsWith('/api/admin')) return adminGuard(req) ?? NextResponse.next();
  return trackingMiddleware(req, NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/|uploads/|favicon.ico|api/webhooks/|api/health).*)'],
};
