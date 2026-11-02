import type { NextRequest, NextResponse } from 'next/server';

// WS1 STUB: WS4 replaces this file (visitor/attribution cookies). Edge-safe code only.
export function trackingMiddleware(_req: NextRequest, res: NextResponse): NextResponse {
  return res;
}
