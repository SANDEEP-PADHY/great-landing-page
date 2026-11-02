import { NextResponse } from 'next/server';
import { MEDIA_KEYS, type MediaKey } from '@/lib/contracts';
import { logAudit } from '@/lib/admin/audit';
import { denyUnlessAdmin } from '@/lib/auth/session';
import { processUpload, removeMedia, updateMediaAlt, UploadError } from '@/lib/media-upload';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Ctx = { params: Promise<{ key: string }> };
const asKey = (k: string): MediaKey | null => (MEDIA_KEYS as readonly string[]).includes(k) ? (k as MediaKey) : null;

export async function POST(req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const key = asKey((await params).key);
  if (!key) return NextResponse.json({ error: 'Unknown media slot' }, { status: 404 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file received' }, { status: 400 });
  const alt = typeof fd?.get('alt') === 'string' ? String(fd?.get('alt')).slice(0, 160) : undefined;
  try {
    const view = await processUpload(key, file, { alt });
    await logAudit('media.upload', key, { name: file.name, bytes: file.size });
    return NextResponse.json(view);
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[media] upload failed', e);
    return NextResponse.json({ error: 'Upload failed on the server' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const key = asKey((await params).key);
  if (!key) return NextResponse.json({ error: 'Unknown media slot' }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { alt?: unknown } | null;
  if (typeof body?.alt !== 'string') return NextResponse.json({ error: 'alt is required' }, { status: 400 });
  const ok = await updateMediaAlt(key, body.alt.trim().slice(0, 160));
  if (!ok) return NextResponse.json({ error: 'Upload an image first' }, { status: 404 });
  await logAudit('media.alt', key);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const key = asKey((await params).key);
  if (!key) return NextResponse.json({ error: 'Unknown media slot' }, { status: 404 });
  await removeMedia(key);
  await logAudit('media.remove', key);
  return NextResponse.json({ ok: true });
}
