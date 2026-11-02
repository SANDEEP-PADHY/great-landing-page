import { NextResponse } from 'next/server';
import { buildIcs } from '@/lib/calendar';
import { getOrderByPublicId } from '@/lib/orders';
import { toSlotView } from '@/lib/slots';
import { verifyOrderToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await ctx.params;
  if (!verifyOrderToken(publicId, new URL(req.url).searchParams.get('t'))) return new NextResponse('Not found', { status: 404 });
  const r = await getOrderByPublicId(publicId);
  if (!r) return new NextResponse('Not found', { status: 404 });
  const ics = buildIcs({
    uid: r.order.id, slot: toSlotView(r.slot), url: r.slot.webinarUrl,
    description: 'GenZy Club live webinar. Join link will be sent on WhatsApp and email.',
  });
  return new NextResponse(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="webinar.ics"' },
  });
}
