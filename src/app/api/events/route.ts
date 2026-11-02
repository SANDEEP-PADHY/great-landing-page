import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { events, visitors } from '@/lib/db/schema';
import { clientIp, userAgent } from '@/lib/request';
import { buildCapiItem, enqueueCapi, loadCustomerForVisitor } from '@/lib/tracking/capi';
import { BrowserEvent, CONTENT_ID, CONTENT_NAME, entryFor, isEventName, pixelMapping, shouldForwardToCapi } from '@/lib/tracking/taxonomy';
import { parseUa } from '@/lib/tracking/ua';

export const runtime = 'nodejs';
const MAX_BYTES = 32 * 1024;
const MAX_EVENTS = 20;
const RATE_PER_MIN = 120;
const CLOCK_SKEW_MS = 10 * 60_000;

const hits = new Map<string, { n: number; reset: number }>();
function limited(key: string, add: number): boolean {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: add, reset: now + 60_000 }); return false; }
  h.n += add;
  return h.n > RATE_PER_MIN;
}

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (!raw || raw.length > MAX_BYTES) return noContent();
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return noContent(); }
    const list = (parsed as { events?: unknown })?.events;
    if (!Array.isArray(list)) return noContent();

    const valid: BrowserEvent[] = [];
    let dropped = 0;
    for (const item of list.slice(0, MAX_EVENTS)) {
      const r = BrowserEvent.safeParse(item);
      if (!r.success || !isEventName(r.data.name)) { dropped++; continue; }
      const schema = entryFor(r.data.name).props.safeParse(r.data.props ?? {});
      if (!schema.success) { dropped++; continue; }
      valid.push({ ...r.data, props: schema.data });
    }
    if (dropped) console.warn(`[events] dropped ${dropped} invalid event(s)`);
    if (!valid.length) return noContent();

    // Visitor id: cookie is authoritative, body is a fallback.
    const cookieVid = req.cookies.get('gz_vid')?.value;
    const ip = clientIp(req.headers);
    const ua = userAgent(req.headers);
    const info = parseUa(ua);
    const visitorKey = cookieVid ?? valid[0]!.visitor_id ?? ip ?? 'anon';
    if (limited(visitorKey, valid.length)) return noContent();

    const country = req.headers.get('cf-ipcountry');
    const now = Date.now();
    const appUrl = process.env.APP_URL ?? '';
    const vid = cookieVid ?? valid[0]!.visitor_id ?? null;

    // Visitor upsert (first touch only on insert).
    if (vid) {
      const first = valid[0]!;
      const utm = Object.fromEntries(Object.entries(first.utm ?? {}).filter(([, v]) => v));
      const touch = Object.keys(utm).length || first.referrer
        ? { ...utm, referrer: first.referrer ?? null, landing_url: first.path ?? null, ts: now }
        : null;
      const fbc = valid.map((e) => e.fbc).find(Boolean) ?? null;
      const fbp = valid.map((e) => e.fbp).find(Boolean) ?? null;
      await db.insert(visitors).values({
        id: vid, firstTouch: touch, lastTouch: touch, fbc, fbp,
        device: info.device, os: info.os, browser: info.browser, country, isBot: info.isBot,
      }).onConflictDoUpdate({
        target: visitors.id,
        set: {
          lastSeenAt: new Date(),
          lastTouch: touch ? sql`${JSON.stringify(touch)}::jsonb` : sql`${visitors.lastTouch}`,
          fbc: sql`coalesce(${fbc}, ${visitors.fbc})`,
          fbp: sql`coalesce(${fbp}, ${visitors.fbp})`,
          firstTouch: sql`coalesce(${visitors.firstTouch}, ${touch ? JSON.stringify(touch) : null}::jsonb)`,
        },
      });
    }

    await db.insert(events).values(valid.map((e) => {
      const t = Date.parse(e.occurred_at);
      const occurred = Number.isFinite(t) && Math.abs(t - now) <= CLOCK_SKEW_MS ? t : now;
      return {
        eventId: e.event_id,
        name: e.name,
        source: 'browser',
        visitorId: vid,
        sessionId: e.session_id ?? null,
        path: e.path ?? null,
        props: { ...(e.props ?? {}), ...(e.viewport ? { viewport: e.viewport } : {}), ...(e.referrer ? { referrer: e.referrer } : {}) },
        utmSource: e.utm?.utm_source ?? null,
        utmCampaign: e.utm?.utm_campaign ?? null,
        utmContent: e.utm?.utm_content ?? null,
        device: info.device,
        ip,
        userAgent: ua,
        isBot: info.isBot,
        occurredAt: new Date(occurred),
      };
    })).onConflictDoNothing();

    // CAPI forwarding (never for bots). Anonymous events carry external_id/IP/UA/fbc/fbp; after a lead, em/ph/fn/ln too.
    if (!info.isBot) {
      const customer = await loadCustomerForVisitor(vid).catch(() => null);
      for (const e of valid) {
        const name = e.name as Parameters<typeof shouldForwardToCapi>[0];
        const props = (e.props ?? {}) as Record<string, unknown>;
        if (!shouldForwardToCapi(name, props)) continue;
        const pm = pixelMapping(name, props)!;
        const t = Date.parse(e.occurred_at);
        await enqueueCapi(buildCapiItem({
          eventName: pm.name,
          eventId: e.event_id,
          occurredAt: Number.isFinite(t) ? new Date(t) : new Date(),
          url: e.path ? appUrl + e.path : appUrl || undefined,
          user: {
            visitorId: vid, ip, userAgent: ua, fbc: e.fbc ?? req.cookies.get('_fbc')?.value, fbp: e.fbp ?? req.cookies.get('_fbp')?.value,
            email: customer?.email, phone: customer?.phone, name: customer?.name,
          },
          customData: { content_ids: [CONTENT_ID], content_name: CONTENT_NAME, ...pm.data },
        })).catch((err) => console.error('[events] enqueue capi failed', err));
      }
    }
  } catch (err) {
    console.error('[events] ingest failed', err);
  }
  return noContent();
}
