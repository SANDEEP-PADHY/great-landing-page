'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { flushNow, touchSession, track } from '@/lib/tracking/client';
import { PixelScript } from './PixelScript';
import { SectionObserver } from './SectionObserver';

type PageType = 'landing' | 'thank_you' | 'legal';

const SCROLL_MARKS = [25, 50, 75, 90, 100];
const HEARTBEAT_MS = 15_000;
const ACTIVE_WINDOW_MS = 30_000;

export function TrackingRoot({ pageType = 'landing' }: { pageType?: PageType }) {
  const pathname = usePathname();

  // Page view (+ view_content on landing), once per path change.
  useEffect(() => {
    touchSession();
    track('page_view', { path: pathname, title: document.title });
    if (pageType === 'landing') track('view_content', { content_name: 'webinar_nov_2026', value: 499, currency: 'INR' });
  }, [pathname, pageType]);

  // Scroll depth, per page view.
  useEffect(() => {
    const hit = new Set<number>();
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      for (const m of SCROLL_MARKS) if (pct >= m && !hit.has(m)) { hit.add(m); track('scroll_depth', { percent: m }); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // Engaged time: heartbeat while visible and user active in last 30s.
  useEffect(() => {
    let lastActive = Date.now();
    let seconds = 0;
    const act = () => { lastActive = Date.now(); };
    const evs = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, act, { passive: true }));
    const iv = setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - lastActive > ACTIVE_WINDOW_MS) return;
      seconds += HEARTBEAT_MS / 1000;
      track('engaged_time', { seconds_total: seconds });
    }, HEARTBEAT_MS);
    return () => { clearInterval(iv); evs.forEach((e) => window.removeEventListener(e, act)); };
  }, [pathname]);

  // Outbound / legal link clicks.
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      try {
        const u = new URL(a.href, location.href);
        const external = u.origin !== location.origin;
        const legal = /^\/(privacy|terms|refund|shipping|contact|disclaimer)/.test(u.pathname);
        if (external || legal) track('outbound_click', { href: u.href.slice(0, 500), text: (a.textContent ?? '').trim().slice(0, 100) });
      } catch { /* ignore */ }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Web vitals + client errors, once per mount.
  useEffect(() => {
    let errs = 0;
    const report = (message: string, source?: string, line?: number) => {
      if (errs++ >= 5) return;
      track('client_error', { message: message.slice(0, 280), source: source?.slice(0, 280), line });
    };
    const onErr = (e: ErrorEvent) => report(e.message, e.filename, e.lineno);
    const onRej = (e: PromiseRejectionEvent) => report(String((e.reason as Error)?.message ?? e.reason));
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    void import('web-vitals').then((w) => {
      const send = (m: { name: string; value: number; rating: string }) =>
        track('web_vital', { metric: m.name as 'LCP', value: Math.round(m.value * 1000) / 1000, rating: m.rating });
      w.onLCP(send); w.onCLS(send); w.onINP(send); w.onFCP(send); w.onTTFB(send);
    }).catch(() => {});
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej); flushNow(); };
  }, []);

  return (
    <>
      <PixelScript />
      <SectionObserver />
    </>
  );
}
