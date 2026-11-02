import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getMediaRow } from '@/lib/media';
import { env } from '@/lib/env';
import { getOrderByPublicId } from '@/lib/orders';
import { verifyOrderToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const o = u.searchParams.get('o') ?? '';
  if (!verifyOrderToken(o, u.searchParams.get('t'))) return new NextResponse('Not found', { status: 404 });
  const r = await getOrderByPublicId(o);
  if (!r || r.order.status !== 'paid') return new NextResponse('Not found', { status: 404 });
  const m = await getMediaRow('bonus_template_file');
  if (!m) return new NextResponse('Template not uploaded yet. Please check back soon.', { status: 404 });
  const file = path.join(env().PRIVATE_DIR, path.basename(m.path));
  try {
    const buf = await readFile(file);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': m.mime ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${(m.originalName ?? path.basename(file)).replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new NextResponse('File missing', { status: 404 });
  }
}
