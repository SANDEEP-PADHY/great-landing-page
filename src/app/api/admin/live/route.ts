import { NextResponse } from 'next/server';
import { getLiveVisitors } from '@/lib/analytics/queries';
import { denyUnlessAdmin } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  return NextResponse.json(await getLiveVisitors(5), { headers: { 'Cache-Control': 'no-store' } });
}
