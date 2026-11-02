// Admin media pipeline. [WS3] (Re-export from src/lib/media.ts if you want one import path.)
import 'server-only';
import { createHash } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revalidateTag } from 'next/cache';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '@/lib/db/client';
import { media } from '@/lib/db/schema';
import { env } from '@/lib/env';
import type { MediaKey, MediaView } from '@/lib/contracts';
import { FILE_EXTS, IMAGE_MIMES, MAX_FILE_BYTES, MAX_IMAGE_BYTES, MEDIA_SPECS } from '@/lib/admin/media-specs';

export class UploadError extends Error {}

const uploadDir = () => path.resolve(env().UPLOAD_DIR);
const privateDir = () => path.resolve(env().PRIVATE_DIR);
const safe = (name: string) => path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');

async function removeFiles(dir: string, names: string[]) {
  await Promise.all([...new Set(names)].map((n) => unlink(path.join(dir, safe(n))).catch(() => undefined)));
}

type Row = typeof media.$inferSelect;
function oldNames(row: Row | undefined): string[] {
  if (!row) return [];
  const list = ((row.srcset as { path: string }[] | null) ?? []).map((s) => s.path);
  return [row.path, ...list].map((p) => path.basename(p));
}

export async function processUpload(key: MediaKey, file: File, opts: { alt?: string } = {}): Promise<MediaView> {
  const spec = MEDIA_SPECS[key];
  const [prev] = await db.select().from(media).where(eq(media.key, key));
  const buf = Buffer.from(await file.arrayBuffer());

  if (spec.kind === 'file') {
    if (buf.length === 0) throw new UploadError('The file is empty.');
    if (buf.length > MAX_FILE_BYTES) throw new UploadError('File is larger than 25 MB.');
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if (!FILE_EXTS.includes(ext)) throw new UploadError('Only PDF, ZIP or HTML files are allowed.');
    const name = `bonus-${createHash('sha1').update(buf).digest('hex').slice(0, 8)}.${ext}`;
    await mkdir(privateDir(), { recursive: true });
    await writeFile(path.join(privateDir(), name), buf);
    await db.insert(media).values({ key, kind: 'file', path: name, mime: file.type || null, bytes: buf.length, originalName: file.name, updatedAt: new Date() })
      .onConflictDoUpdate({ target: media.key, set: { kind: 'file', path: name, srcset: null, width: null, height: null, mime: file.type || null, bytes: buf.length, originalName: file.name, updatedAt: new Date() } });
    if (prev && prev.path !== name) await removeFiles(privateDir(), [prev.path]);
    revalidateTag('site');
    return { key, src: '/api/download/template' };
  }

  if (!IMAGE_MIMES.includes(file.type)) throw new UploadError('Upload a JPG, PNG or WebP image.');
  if (buf.length === 0) throw new UploadError('The file is empty.');
  if (buf.length > MAX_IMAGE_BYTES) throw new UploadError('Image is larger than 8 MB.');

  let base: Buffer;
  try {
    base = await sharp(buf).rotate().toBuffer(); // auto-rotate; metadata is dropped by default
  } catch {
    throw new UploadError('That file could not be read as an image.');
  }
  const hash = createHash('sha1').update(base).digest('hex').slice(0, 8);
  const ext = spec.format === 'jpeg' ? 'jpg' : spec.format;
  const outputs: { w: number; h: number; name: string; data: Buffer }[] = [];

  for (const w of spec.widths) {
    let pipe = sharp(base);
    if (spec.box) pipe = pipe.resize(spec.box.w, spec.box.h, { fit: 'cover', position: 'attention' });
    else if (spec.square) pipe = pipe.resize(w, w, { fit: 'cover' });
    else pipe = pipe.resize({ width: w, withoutEnlargement: true });
    pipe = spec.format === 'jpeg' ? pipe.jpeg({ quality: 84, mozjpeg: true }) : spec.format === 'png' ? pipe.png({ compressionLevel: 9 }) : pipe.webp({ quality: 80 });
    const { data, info } = await pipe.toBuffer({ resolveWithObject: true });
    if (outputs.some((o) => o.w === info.width)) continue; // small source: no duplicate widths
    outputs.push({ w: info.width, h: info.height, name: `${key}-${hash}-${info.width}.${ext}`, data });
  }
  outputs.sort((a, b) => a.w - b.w);
  const largest = outputs[outputs.length - 1]!;

  await mkdir(uploadDir(), { recursive: true });
  await Promise.all(outputs.map((o) => writeFile(path.join(uploadDir(), o.name), o.data)));

  const srcset = outputs.map((o) => ({ w: o.w, path: `/uploads/${o.name}` }));
  const alt = opts.alt !== undefined ? opts.alt : prev?.alt ?? null;
  const values = { kind: 'image', path: `/uploads/${largest.name}`, srcset, width: largest.w, height: largest.h, alt, mime: `image/${spec.format}`, bytes: largest.data.length, originalName: file.name, updatedAt: new Date() };
  await db.insert(media).values({ key, ...values }).onConflictDoUpdate({ target: media.key, set: values });

  const keep = new Set(outputs.map((o) => o.name));
  await removeFiles(uploadDir(), oldNames(prev).filter((n) => !keep.has(n)));
  revalidateTag('site');

  return { key, src: values.path, srcset: srcset.map((s) => ({ w: s.w, src: s.path })), width: largest.w, height: largest.h, alt: alt ?? undefined };
}

export async function updateMediaAlt(key: MediaKey, alt: string): Promise<boolean> {
  const res = await db.update(media).set({ alt, updatedAt: new Date() }).where(eq(media.key, key)).returning({ key: media.key });
  if (res.length) revalidateTag('site');
  return res.length > 0;
}

export async function removeMedia(key: MediaKey): Promise<void> {
  const [row] = await db.select().from(media).where(eq(media.key, key));
  if (!row) return;
  await db.delete(media).where(eq(media.key, key));
  await removeFiles(row.kind === 'file' ? privateDir() : uploadDir(), oldNames(row));
  revalidateTag('site');
}
