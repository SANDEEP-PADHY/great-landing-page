'use client';
import { useEffect } from 'react';
import { track } from '@/lib/tracking/client';

const VISIBLE_RATIO = 0.5;
const DWELL_MS = 1000;

/** Tracks [data-section] visibility: section_view (≥50% for ≥1s, once) and section_time on page hide. */
export function SectionObserver() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
    if (!els.length || !('IntersectionObserver' in window)) return;

    const visibleSince = new Map<string, number>();
    const totals: Record<string, number> = {};
    const fired = new Set<string>();
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const idx = new Map(els.map((el, i) => [el.dataset.section!, i]));

    const closeSpan = (id: string) => {
      const s = visibleSince.get(id);
      if (s != null) { totals[id] = (totals[id] ?? 0) + (Date.now() - s); visibleSince.delete(id); }
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.section!;
        // Tall sections can never reach 50% of their own area: also accept covering half the viewport.
        const vis = e.intersectionRatio >= VISIBLE_RATIO ||
          (e.isIntersecting && e.intersectionRect.height >= window.innerHeight * VISIBLE_RATIO);
        if (vis) {
          if (!visibleSince.has(id)) visibleSince.set(id, Date.now());
          if (!fired.has(id) && !timers.has(id)) {
            timers.set(id, setTimeout(() => {
              if (visibleSince.has(id) && !fired.has(id)) {
                fired.add(id);
                track('section_view', { section: id, index: idx.get(id) ?? 0 });
              }
              timers.delete(id);
            }, DWELL_MS));
          }
        } else {
          closeSpan(id);
          const t = timers.get(id);
          if (t) { clearTimeout(t); timers.delete(id); }
        }
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    els.forEach((el) => io.observe(el));

    let sent = false;
    const onHide = () => {
      if (document.visibilityState !== 'hidden' || sent) return;
      Object.keys(Object.fromEntries(visibleSince)).forEach(closeSpan);
      const sections = Object.fromEntries(Object.entries(totals).filter(([, ms]) => ms > 0).map(([k, v]) => [k, Math.round(v)]));
      if (Object.keys(sections).length) { sent = true; track('section_time', { sections }); }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onHide);
      timers.forEach(clearTimeout);
    };
  }, []);
  return null;
}
