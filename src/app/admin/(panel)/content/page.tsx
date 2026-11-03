import type { Metadata } from 'next';
import { MediaCard } from '@/components/admin/MediaCard';
import { PageHeader } from '@/components/admin/ui';
import { db } from '@/lib/db/client';
import { media } from '@/lib/db/schema';
import { MEDIA_KEYS } from '@/lib/contracts';
import { FILE_EXTS, IMAGE_MIMES, MEDIA_SPECS } from '@/lib/admin/media-specs';

export const metadata: Metadata = { title: 'Content & media' };
export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  const rows = await db.select().from(media);
  return (
    <>
      <PageHeader title="Content & media" subtitle="Replace any image on the landing page. Changes go live within seconds. Until you upload, a neutral placeholder is shown." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MEDIA_KEYS.map((key) => {
          const spec = MEDIA_SPECS[key];
          const row = rows.find((r) => r.key === key);
          return (
            <MediaCard key={key} mediaKey={key} title={spec.label} hint={spec.hint} kind={spec.kind}
              accept={spec.kind === 'file' ? FILE_EXTS.map((e) => `.${e}`).join(',') : IMAGE_MIMES.join(',')}
              current={row ? { src: spec.kind === 'image' ? row.path : null, alt: row.alt ?? '', bytes: row.bytes, name: row.originalName, updatedAt: row.updatedAt.toISOString() } : null} />
          );
        })}
      </div>
    </>
  );
}
