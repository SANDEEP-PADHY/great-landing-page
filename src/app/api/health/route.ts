import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbOk = false;
  try { await sql`select 1`; dbOk = true; } catch { /* reported below */ }
  return NextResponse.json({ ok: dbOk, db: dbOk, commit: process.env.NEXT_PUBLIC_COMMIT ?? '' }, { status: dbOk ? 200 : 503 });
}
