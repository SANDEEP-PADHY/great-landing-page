import { NextResponse, type NextRequest } from 'next/server';
import { adminGuard } from '@/lib/auth/guard';
import { trackingMiddleware } from '@/lib/tracking/middleware';

// adminGuard() lives in src/lib/auth/guard.ts (WS3); trackingMiddleware() in src/lib/tracking/middleware.ts (WS4). Keep them separate.

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p.startsWith('/admin') || p.startsWith('/api/admin')) return (await adminGuard(req)) ?? NextResponse.next();
  return trackingMiddleware(req, NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/|uploads/|favicon.ico|api/webhooks/|api/health).*)'],
};
