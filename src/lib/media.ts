import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from './db/client';
import { media } from './db/schema';
import type { MediaKey, MediaMap, MediaView } from './contracts';

type Row = typeof media.$inferSelect;

export function rowToView(r: Row): MediaView {
  const srcset = Array.isArray(r.srcset) ? (r.srcset as { w: number; path: string }[]).map((s) => ({ w: s.w, src: s.path })) : undefined;
  return {
    key: r.key as MediaKey, src: r.path, srcset,
    width: r.width ?? undefined, height: r.height ?? undefined, alt: r.alt ?? undefined,
  };
}

async function load(): Promise<MediaMap> {
  const rows = await db.select().from(media);
  const out: MediaMap = {};
  for (const r of rows) {
    // the private bonus template is never exposed as a public URL
    if (r.kind === 'file') continue;
    out[r.key as MediaKey] = rowToView(r);
  }
  return out;
}
const cached = unstable_cache(load, ['site-media'], { tags: ['site'], revalidate: 300 });

export async function getMediaMap(): Promise<MediaMap> {
  try { return await cached(); } catch { return load(); }
}
export async function getMediaRow(key: MediaKey): Promise<Row | undefined> {
  const rows = await db.select().from(media);
  return rows.find((r) => r.key === key);
}
// WS3 adds processUpload()/removeMedia() in src/lib/media-upload.ts and imports from here.
