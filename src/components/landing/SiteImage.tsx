import type { CSSProperties } from 'react';
import type { MediaKey, MediaMap } from '@/lib/contracts';

const LABELS: Partial<Record<MediaKey, { title: string; sub?: string }>> = {
  hero: { title: 'Hero portrait', sub: 'Sandeep at desk · 3:4 · 1200×1600' },
  proof: { title: 'Razorpay dashboard screenshot', sub: 'Customer details blurred' },
  host: { title: 'Host photo' },
  claude_logo: { title: 'Claude logo' },
};

/** Uploaded media if present, otherwise the neutral SVG placeholder for that slot. */
export function SiteImage({
  media,
  k,
  priority = false,
  sizes = '(min-width: 900px) 40vw, 100vw',
  style,
}: {
  media: MediaMap;
  k: MediaKey;
  priority?: boolean;
  sizes?: string;
  style?: CSSProperties;
}) {
  const m = media[k];
  const label = LABELS[k];
  const common: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style };
  if (m) {
    const srcSet = m.srcset?.map((s) => `${s.src} ${s.w}w`).join(', ');
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={m.src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        width={m.width}
        height={m.height}
        alt={m.alt ?? label?.title ?? ''}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        style={common}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/placeholders/${k}.svg`}
      alt={label ? `${label.title} placeholder` : ''}
      loading={priority ? 'eager' : 'lazy'}
      style={common}
    />
  );
}
