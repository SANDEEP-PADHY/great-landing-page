import { NextResponse } from 'next/server';
import { CreateOrderRequest, type ApiError } from '@/lib/contracts';
import { OrderError, createCheckoutOrder, parseAttr } from '@/lib/orders';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp, parseCookies, userAgent } from '@/lib/request';

export const dynamic = 'force-dynamic';
const err = (body: ApiError, status: number) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`order:${ip ?? 'unknown'}`, 10, 10 * 60_000)) return err({ error: 'rate_limited' }, 429);

  let body: unknown;
  try { body = await req.json(); } catch { return err({ error: 'validation' }, 400); }
  const parsed = CreateOrderRequest.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0] ?? 'form')] = i.message;
    return err({ error: 'validation', fields }, 400);
  }

  const c = parseCookies(req.headers);
  try {
    const res = await createCheckoutOrder(parsed.data, {
      visitorId: c['gz_vid'], fbc: c['_fbc'], fbp: c['_fbp'], attr: parseAttr(c['gz_attr']),
      ip, userAgent: userAgent(req.headers),
    });
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof OrderError) {
      if (e.code === 'slot_closed') return err({ error: 'slot_closed' }, 409);
      if (e.code === 'sales_closed') return err({ error: 'sales_closed' }, 410);
      if (e.code === 'payment_provider') return err({ error: 'payment_provider' }, 502);
    }
    console.error('[order] failed', e);
    return err({ error: 'payment_provider' }, 502);
  }
}
