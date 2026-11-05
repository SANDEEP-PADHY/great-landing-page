'use client';
import { COOKIE, parseAttr } from './attribution';
import { isEventName, pixelMapping, type EventName } from './taxonomy';

/* Client tracker. Never throws, never blocks UI. */

type Fbq = ((...a: unknown[]) => void) & { queue?: unknown[][]; loaded?: boolean };
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

import { PIXEL_ID } from '@/lib/tracking/pixel';
const ENDPOINT = '/api/events';
const FLUSH_MS = 2000;
const FLUSH_AT = 10;
const SESSION_MIN = 30;

type Wire = Record<string, unknown>;
const queue: Wire[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sessionReferrerSent = false;
let bound = false;

function readCookie(name: string): string | undefined {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]!) : undefined;
  } catch { return undefined; }
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch { /* ignore */ }
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

export function getVisitorId(): string | undefined { return readCookie(COOKIE.vid); }

/** Session id with 30-min rolling cookie. */
export function touchSession(): string {
  let sid = readCookie(COOKIE.sid);
  if (!sid) sid = uuid();
  writeCookie(COOKIE.sid, sid, SESSION_MIN * 60);
  return sid;
}

function ensureFbq(): Fbq | undefined {
  return typeof window === 'undefined' ? undefined : window.fbq;
}

function flush(useBeacon = false) {
  if (timer) { clearTimeout(timer); timer = null; }
  while (queue.length) {
    const batch = queue.splice(0, 20);
    const body = JSON.stringify({ events: batch });
    try {
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }))) continue;
      }
      void fetch(ENDPOINT, { method: 'POST', body, headers: { 'content-type': 'text/plain' }, keepalive: true }).catch(() => {});
    } catch { /* ignore */ }
  }
}

function schedule() {
  if (queue.length >= FLUSH_AT) return flush();
  if (!timer) timer = setTimeout(() => flush(), FLUSH_MS);
}

function bindFlushOnHide() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
  window.addEventListener('pagehide', () => flush(true));
}

export function track(name: EventName, props: Record<string, unknown> = {}, opts?: { eventId?: string }): string {
  const eventId = opts?.eventId ?? uuid();
  try {
    if (typeof window === 'undefined' || !isEventName(name)) return eventId;
    bindFlushOnHide();

    const pm = pixelMapping(name, props);
    if (pm && PIXEL_ID) {
      const fbq = ensureFbq();
      const args: unknown[] = [pm.kind === 'std' ? 'track' : 'trackCustom', pm.name, pm.data, { eventID: eventId }];
      if (fbq) fbq(...args);
      else (window._pendingFbq ??= []).push(args);
    }

    const sid = touchSession();
    const attr = parseAttr(readCookie(COOKIE.attr));
    const wire: Wire = {
      event_id: eventId,
      name,
      occurred_at: new Date().toISOString(),
      visitor_id: getVisitorId(),
      session_id: sid,
      path: location.pathname,
      page_title: document.title,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      utm: {
        utm_source: attr.utm_source, utm_medium: attr.utm_medium, utm_campaign: attr.utm_campaign,
        utm_content: attr.utm_content, utm_term: attr.utm_term,
      },
      fbc: readCookie(COOKIE.fbc),
      fbp: readCookie(COOKIE.fbp),
      props,
    };
    if (!sessionReferrerSent && document.referrer) { wire.referrer = document.referrer.slice(0, 500); }
    sessionReferrerSent = true;
    queue.push(wire);
    schedule();
  } catch { /* never throw */ }
  return eventId;
}

declare global {
  interface Window { _pendingFbq?: unknown[][] }
}

/** Drain Pixel calls queued before fbq loaded. Called by PixelScript once fbq exists. */
export function drainPendingPixel() {
  const fbq = ensureFbq();
  if (!fbq || !window._pendingFbq) return;
  const q = window._pendingFbq;
  window._pendingFbq = [];
  for (const a of q) { try { fbq(...a); } catch { /* ignore */ } }
}

/** Advanced matching after lead: Pixel hashes the values in the browser. */
export function setPixelUserData(d: { email: string; phone: string; name: string }): void {
  try {
    const fbq = ensureFbq();
    if (!fbq || !PIXEL_ID) return;
    const parts = d.name.trim().split(/\s+/);
    let ph = d.phone.replace(/\D/g, '');
    if (ph.length === 10) ph = '91' + ph;
    fbq('init', PIXEL_ID, {
      em: d.email.trim().toLowerCase(),
      ph,
      fn: (parts[0] ?? '').toLowerCase(),
      ln: (parts.length > 1 ? parts[parts.length - 1]! : '').toLowerCase(),
      external_id: getVisitorId(),
    });
  } catch { /* ignore */ }
}

export function flushNow() { flush(); }
