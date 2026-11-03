import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/admin/audit';
import { denyUnlessAdmin } from '@/lib/auth/session';
import { sendCapiTestEvent } from '@/lib/tracking/capi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  try {
    const res = await sendCapiTestEvent();
    await logAudit('capi.test', null, res);
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
