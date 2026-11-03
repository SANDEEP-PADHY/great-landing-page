import { NextResponse } from 'next/server';
import type { ApiError, StatusResponse } from '@/lib/contracts';
import { getOrderReceipt } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const r = await getOrderReceipt(u.searchParams.get('o') ?? '', u.searchParams.get('t') ?? '');
  if (!r) return NextResponse.json({ error: 'not_found' } satisfies ApiError, { status: 404 });
  const status: StatusResponse['status'] = r.status === 'paid' ? 'paid' : r.status === 'pending' ? 'pending' : 'failed';
  return NextResponse.json({ status, slot: { dayLabel: r.slot.dayLabel, dateLabel: r.slot.dateLabel } } satisfies StatusResponse);
}
