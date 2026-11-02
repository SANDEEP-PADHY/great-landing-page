# 09: Workstreams, Shared Contracts, Merge and Test Plan

Four parallel workstreams. Each one is a separate build thread on its own branch with its own PR into the base branch (the repo default, currently `claude/project-thread-gigskf`; deploy with `BRANCH=<base>`).

| WS | Name | Owns | Milestones |
|---|---|---|---|
| **WS1** | Core, payments, email, infra | scaffold, env, DB schema + migrations + seed, settings/media/slots/pricing read layer, Razorpay order/verify/status/webhook, `fulfilOrder`, tokens, Resend emails + templates, invoice/calendar/download routes, worker runner, Nginx/PM2/deploy/backup | M0, M1a (server), M1b (server), M1c |
| **WS2** | Public site | landing page port, checkout sheet + Razorpay popup, thank-you page, invoice page UI, six legal pages, placeholders, metadata, landing CSS | M1a, M1b (UI) |
| **WS3** | Admin panel | auth + guard, all `/admin` pages, admin API routes, media upload pipeline (`processUpload`), CSV export, `hash-password` script | M2 |
| **WS4** | Tracking & analytics | taxonomy, middleware cookies/attribution, client tracker + Pixel + `TrackingRoot` + `PurchasePixel`, `/api/events`, `recordServerEvent`, CAPI sender + outbox job, analytics query library | M3 |

## Order of work
1. **WS1 does M0 first** (target: a few hours) and gets it merged. Its PR contains the scaffold, the full schema, `contracts.ts`, and the **stubs** below so every other stream compiles from day one.
2. WS2, WS3 and WS4 start at the same time as WS1, on work that needs nothing from M0 (WS2: porting markup/CSS into components; WS3: admin layout and UI kit; WS4: taxonomy and client tracker). Each rebases onto the base branch as soon as M0 merges.
3. After M0, all four build to completion **without stopping to test** (owner's rule). Each stream finishes with `pnpm typecheck && pnpm lint && pnpm build` only, then opens its PR.
4. Merge order: WS1 → WS2 → WS4 → WS3 (WS3 last because it reads from everything). Rebase conflicts in `package.json`/`pnpm-lock.yaml`: take both dependency lists and re-run `pnpm install`.
5. Then the two test passes below.

## File ownership
Only the owner edits a file. Shared files:
| File | Owner | Others may |
|---|---|---|
| `package.json`, `pnpm-lock.yaml` | WS1 | add their own dependencies |
| `src/lib/db/schema.ts` | WS1 | request additive columns via the coordinator |
| `src/lib/contracts.ts` | WS1 | request additions via the coordinator |
| `src/middleware.ts` | WS4 writes `trackingMiddleware()`; WS3 writes `adminGuard()` | the exported `middleware()` just calls `adminGuard` for `/admin`,`/api/admin` and `trackingMiddleware` for pages. WS1 creates the file in M0 with both as no-op stubs |
| `src/app/layout.tsx` | WS2 | WS4's `<TrackingRoot/>` is rendered inside `<body>` (WS1 stub in M0) |
| `scripts/worker.ts` | WS1 | WS4 provides `registerCapiJob(register)` |

## Stubs WS1 ships in M0 (replaced by the owning stream)
| Module | Stub behaviour | Real owner |
|---|---|---|
| `src/lib/tracking/client.ts` → `track()`, `setPixelUserData()` | returns a uuid, no-op | WS4 |
| `src/lib/tracking/server.ts` → `recordServerEvent()` | logs, resolves | WS4 |
| `src/lib/tracking/capi.ts` → `registerCapiJob()` | no-op | WS4 |
| `src/components/tracking/TrackingRoot.tsx`, `PurchasePixel.tsx` | render `null` | WS4 |
| `src/lib/analytics/queries.ts` | functions return empty/zero data of the right type | WS4 |
| `src/lib/email/send.ts` → `sendOrderConfirmation` etc. | logs, resolves | WS1 (later in its own stream) |
| `src/lib/auth/session.ts` → `requireAdmin()` | throws 401 | WS3 |
| `src/middleware.ts` | passes through | WS3 + WS4 |

## Shared contracts (`src/lib/contracts.ts`)
```ts
import { z } from 'zod';

export const SLOT_IDS = ['s7', 's8', 's9', 's10'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export const MEDIA_KEYS = ['hero', 'proof', 'host', 'claude_logo', 'bonus_template_cover',
  'og_image', 'logo', 'favicon', 'bonus_template_file'] as const;
export type MediaKey = (typeof MEDIA_KEYS)[number];

export type Settings = {
  whatsapp_link: string;
  contact_email: string;
  contact_phone: string;
  offer_price_paise: number;
  regular_price_paise: number;
  offer_ends_at: string;            // ISO with +05:30
  sales_open: boolean;
  claude_bonus_value: string;
  email_abandoned_enabled: boolean;
  email_abandoned_delay_min: number;
  email_admin_alert_enabled: boolean;
  email_auto_reminder_enabled: boolean;
  capi_test_event_code: string;
};
export type SettingKey = keyof Settings;
export type PublicSettings = Pick<Settings, 'whatsapp_link' | 'contact_email' | 'contact_phone'
  | 'offer_price_paise' | 'regular_price_paise' | 'offer_ends_at' | 'sales_open' | 'claude_bonus_value'>;

export type SlotView = { id: SlotId; dayLabel: string; dateLabel: string; startsAt: string; endsAt: string; isOpen: boolean };
export type PriceView = { pricePaise: number; regularPaise: number; offerEndsAt: string; isOffer: boolean };
export type MediaView = { key: MediaKey; src: string; srcset?: { w: number; src: string }[]; width?: number; height?: number; alt?: string };
export type MediaMap = Partial<Record<MediaKey, MediaView>>;

export const CreateOrderRequest = z.object({
  slotId: z.enum(SLOT_IDS),
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().trim().toLowerCase().email().max(120),
  leadEventId: z.string().uuid(),
});
export type CreateOrderResponse = {
  publicId: string; razorpayOrderId: string; amount: number; currency: 'INR'; keyId: string;
  prefill: { name: string; email: string; contact: string }; description: string;
};
export const VerifyRequest = z.object({
  razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string(),
});
export type VerifyResponse = { ok: true; redirect: string };
export type StatusResponse = { status: 'pending' | 'paid' | 'failed'; slot: { dayLabel: string; dateLabel: string } };
export type ApiError = { error: 'validation' | 'slot_closed' | 'sales_closed' | 'rate_limited' | 'payment_provider' | 'bad_signature' | 'not_found'; fields?: Record<string, string> };

export type OrderReceipt = {
  orderId: string; publicId: string; status: 'pending' | 'paid' | 'failed' | 'expired';
  amountPaise: number; paymentId: string | null; method: string | null; paidAt: string | null; createdAt: string;
  customer: { name: string; email: string; phone: string };
  slot: SlotView;
};

export type DateRange = { from: Date; to: Date };
```

## Function contracts between streams
**WS1 exports** (`src/lib/*`):
```ts
getSettings(): Promise<Settings>                     // cached, tag 'site'
getPublicSettings(): Promise<PublicSettings>
updateSettings(patch: Partial<Settings>): Promise<void>   // used by WS3; revalidates 'site'
getSlots(): Promise<SlotView[]>
updateSlot(id: SlotId, patch: { isOpen?: boolean; webinarUrl?: string | null }): Promise<void>  // WS3
getPriceView(s: PublicSettings, now: Date): PriceView
formatINR(paise: number): string                     // '₹499'
getMediaMap(): Promise<MediaMap>
getOrderReceipt(publicId: string, token: string): Promise<OrderReceipt | null>
signOrderToken(publicId: string): string
changeOrderSlot(orderId: string, slotId: SlotId): Promise<void>
resendConfirmation(orderId: string): Promise<void>
sendSlotReminder(slotId: SlotId, opts?: { resend?: boolean }): Promise<{ sent: number; failed: number }>
clientIp(h: Headers): string | null; userAgent(h: Headers): string | null
db                                                    // drizzle instance, for read queries in WS3/WS4
```
**WS3 exports:** `requireAdmin(): Promise<void>` (throws/redirects), `adminGuard(req): NextResponse | undefined`, `processUpload(key: MediaKey, file: File): Promise<MediaView>`, `removeMedia(key)`.

**WS4 exports:**
```ts
// client
track(name: EventName, props?: Record<string, unknown>, opts?: { eventId?: string }): string
setPixelUserData(d: { email: string; phone: string; name: string }): void
<TrackingRoot pageType="landing" | "thank_you" | "legal" />
<PurchasePixel orderId={string} valuePaise={number} slotId={SlotId} />
// server
trackingMiddleware(req: NextRequest, res: NextResponse): NextResponse
recordServerEvent(i: { name: 'lead' | 'purchase'; eventId: string; orderId: string; customerId: string; valuePaise?: number }): Promise<void>
registerCapiJob(register: (name: string, everyMs: number, fn: () => Promise<void>) => void): void
sendCapiTestEvent(): Promise<{ ok: boolean; fbtraceId?: string; error?: string }>
// analytics (all exclude bots, IST buckets; money from orders table)
getKpis(r: DateRange): Promise<{ revenuePaise: number; sales: number; revenueTodayPaise: number; visitors: number; visitorToPurchasePct: number; checkoutToPurchasePct: number; avgSalesPerDay: number; abandoned: number }>
getDailySeries(r: DateRange): Promise<{ day: string; revenuePaise: number; sales: number; visitors: number }[]>
getFunnel(r: DateRange): Promise<{ step: 'page_view' | 'cta_click' | 'checkout_open' | 'lead_submit' | 'payment_open' | 'purchase'; visitors: number; pctOfPrev: number }[]>
getSalesBySlot(r: DateRange): Promise<{ slotId: SlotId; label: string; sales: number; revenuePaise: number }[]>
getCampaignTable(r: DateRange): Promise<{ source: string; campaign: string; content: string; visitors: number; ctaClicks: number; checkouts: number; sales: number; revenuePaise: number; convPct: number }[]>
getLiveVisitors(minutes?: number): Promise<{ count: number; recent: { name: string; path: string; at: string }[] }>
getTrafficSources(r: DateRange); getDeviceSplit(r: DateRange); getCountrySplit(r: DateRange)
getScrollDepth(r: DateRange); getSectionEngagement(r: DateRange); getCtaByLocation(r: DateRange)
getFaqOpens(r: DateRange); getFormDropoff(r: DateRange); getPaymentOutcomes(r: DateRange)
getEngagement(r: DateRange); getHourlyHeatmap(r: DateRange); getWebVitals(r: DateRange)
listEvents(f: { name?: string; visitorId?: string; range: DateRange; page: number }): Promise<{ rows: EventRow[]; total: number }>
getVisitorJourney(visitorId: string): Promise<EventRow[]>
getCapiHealth(): Promise<{ pixelId: string; sent24h: number; pending: number; failed24h: number; lastError?: { message: string; fbtraceId?: string; at: string } ; dedupPairs24h: number }>
```
WS4 defines exact return types for the un-typed lines above in `queries.ts` during M0+1 and WS3 renders whatever shape is there.

## Build steps per workstream (no testing between steps)
**WS1:** (1) M0 scaffold + schema + contracts + stubs + seed → PR, merge. (2) settings/slots/pricing/media read layer, request helpers, tokens. (3) Razorpay client, order/verify/status routes, webhook, `fulfilOrder`, `changeOrderSlot`. (4) Resend send module, 4 templates, calendar + download routes, admin alert. (5) worker runner + email jobs. (6) Nginx, PM2, deploy script, backup script, `setup-vps.md`; provision the VPS and deploy as soon as WS2's M1a pages exist. (7) typecheck/lint/build → PR.

**WS2:** (1) landing CSS + content file + all section components (static, placeholders). (2) page assembly with server data, countdown, slot picker, sticky bar, claim pill, FAQ. (3) checkout sheet + Razorpay hook + error mapping. (4) thank-you page (paid/pending states) + invoice page. (5) six legal pages + footer + metadata + OG + robots. (6) `data-section` attributes and all `track()` calls from `05-public-site.md`. (7) typecheck/lint/build → PR. **Priority: steps 1, 2, 5 first and push early, so WS1 can deploy the M1a site for Razorpay review.**

**WS3:** (1) auth (login, session, rate limit, guard, `requireAdmin`, hash script). (2) layout, sidebar, UI kit, date-range picker. (3) Settings and Slots pages. (4) Content & media with `processUpload`. (5) Buyers list, detail, CSV, Abandoned. (6) Dashboard and Analytics pages wired to WS4 query functions. (7) Emails and Tracking pages. (8) typecheck/lint/build → PR.

**WS4:** (1) taxonomy with Zod props + Meta mapping. (2) middleware cookies + attribution. (3) client tracker, Pixel loader, `TrackingRoot` auto events, `PurchasePixel`, `setPixelUserData`. (4) `/api/events` ingest + visitors upsert + bot filter. (5) hashing, CAPI payload builder, outbox, `recordServerEvent`, `registerCapiJob`, `sendCapiTestEvent`. (6) analytics query library. (7) typecheck/lint/build → PR.

## Test pass 1 (M4, after all four PRs merge; Razorpay **test mode**, CAPI test code on)
Run on the live server, phone + desktop. Log every failure in one list, fix in one batch.
1. Page: loads < 2.5 s on 4G (Lighthouse mobile ≥ 90 performance), all sections match design, countdown ticks, closed slots grey out (temporarily change a slot's `starts_at` to test), sticky bar always visible, claim pill opens the sheet.
2. Checkout: validation messages, slot chips, Razorpay test UPI `success@razorpay` → thank-you page paid; failed payment shows retry; dismiss works.
3. Close the tab right after paying → webhook still marks paid and sends the email.
4. Confirmation email arrives (inbox, not spam) with working WhatsApp, calendar, template, invoice links.
5. Abandoned flow: submit form, don't pay, set delay to 1 min → abandoned email once; row in Admin → Abandoned with working WhatsApp link.
6. Admin: login + lockout after 5 wrong tries; dashboard numbers match the test orders; buyer detail journey shows the events; change slot; CSV export opens in Sheets; upload each image → visible on the page within one refresh; change WhatsApp link → thank-you page and next email use it; slot reminder email sends.
7. Tracking: Meta Events Manager → Test events shows PageView, ViewContent, CTAClick, InitiateCheckout, Lead, AddPaymentInfo, Purchase from **Browser and Server, Deduplicated**; `events` table has scroll, section, FAQ, engaged time, web vitals; Admin → Tracking shows 0 failed.
8. Legal pages reachable from the footer; `/thank-you`, `/admin` are `noindex`.
9. Backup script runs and a restore to a scratch DB works.

## Test pass 2 (M5)
Re-test only what failed in pass 1, then switch to live Razorpay keys + live webhook, clear the CAPI test code, make one real ₹499 payment end to end, confirm it in Razorpay, admin, email and Events Manager, refund it manually in Razorpay. Then the owner launches ads.
