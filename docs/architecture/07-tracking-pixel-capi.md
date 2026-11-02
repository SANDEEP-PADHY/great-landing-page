# 07: Tracking — Event Taxonomy, Meta Pixel, Conversions API, Dedup

Owner: **WS4**. WS2 places `track()` calls at the points listed in `05-public-site.md`; WS1 calls `recordServerEvent()` for `lead` and `purchase`.

## Goals
1. **Every** visitor action lands in our own `events` table, so the admin panel can show full funnels, journeys and engagement without depending on Meta.
2. Funnel events reach Meta **twice** (browser Pixel + server CAPI) with the **same `event_id`**, so Meta deduplicates them and still gets the event when the Pixel is blocked (ad blockers, iOS, in-app browsers).
3. Server events carry strong match keys (hashed email, phone, name, external ID, IP, UA, `fbc`, `fbp`) for high Event Match Quality.

## Identity and attribution (middleware, `src/middleware.ts` → `trackingMiddleware()`)
Runs on page requests (not `/_next`, `/uploads`, `/api`, `/admin`).
| Cookie | Value | Lifetime | Set by |
|---|---|---|---|
| `gz_vid` | uuid visitor ID | 400 days | middleware if missing |
| `gz_sid` | uuid session ID | 30 min rolling | client tracker |
| `gz_attr` | JSON last-touch `{ utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, referrer, landing_url, ts }` | 30 days | middleware, only when the URL has a `utm_*` or `fbclid` (does not overwrite with empty) |
| `_fbc` | `fb.1.<ms>.<fbclid>` | 90 days | middleware when `fbclid` present (Pixel also sets it) |
| `_fbp` | `fb.1.<ms>.<10-digit random>` | 90 days | Pixel; middleware sets one if missing so the very first server event has it |

All cookies: `Path=/; SameSite=Lax; Secure`, not HttpOnly (tracker reads them). First touch is stored once in `visitors.first_touch` on the first `/api/events` call.

Client IP: `cf-connecting-ip` → first `x-forwarded-for` → `x-real-ip` (`src/lib/request.ts`, WS1). Country: `cf-ipcountry`.

## Event taxonomy (canonical; `src/lib/tracking/taxonomy.ts`)
Internal names are snake_case. **Pixel** = browser `fbq` call. **CAPI** = server sends to Meta. "Std" = Meta standard event, "Custom" = `trackCustom`.

| Internal event | Fired when | Key props | Pixel | CAPI | event_id |
|---|---|---|---|---|---|
| `page_view` | any page load (landing, legal, thank-you) | `path`, `title` | Std `PageView` | yes | uuid |
| `view_content` | landing page load | `content_name:'webinar_nov_2026'`, `value`, `currency` | Std `ViewContent` | yes | uuid |
| `scroll_depth` | 25 / 50 / 75 / 90 / 100 % first reached | `percent` | Custom `ScrollDepth` only at 50 and 90 | 50 and 90 | uuid |
| `section_view` | a `[data-section]` is ≥50 % visible for ≥1 s (once per section per page view) | `section`, `index` | — | — | uuid |
| `section_time` | on page hide: visible ms per section | `sections: {id: ms}` | — | — | uuid |
| `engaged_time` | heartbeat every 15 s while tab visible and user active in last 30 s | `seconds_total` | Custom `Engaged30s` once at 30 s, `Engaged120s` once at 120 s | same two | uuid |
| `cta_click` | any Book/CTA button or the claim pill | `location: hero \| sticky_bar \| pricing \| final \| claim_pill`, `slot_id?` | Custom `CTAClick` | yes | uuid |
| `slot_select` | slot card / chip chosen | `slot_id`, `location: pricing \| sheet` | — | — | uuid |
| `faq_open` | FAQ item opened | `index`, `question` | — | — | uuid |
| `media_click` | proof image tapped | `key` | — | — | uuid |
| `checkout_open` | checkout sheet opens | `location`, `slot_id`, `value`, `currency` | Std `InitiateCheckout` | yes | uuid |
| `form_field_complete` | valid field blur | `field: name \| phone \| email` | — | — | uuid |
| `form_error` | invalid submit / server validation | `field`, `code` | — | — | uuid |
| `checkout_close` | sheet closed without submit | `stage: form` | — | — | uuid |
| `lead_submit` | form submitted (browser) | `slot_id`, `value` | Std `Lead` | **server** sends `Lead` (with user data) | `leadEventId` (browser uuid, passed to the order API) |
| `payment_open` | Razorpay popup opened | `slot_id`, `value` | Std `AddPaymentInfo` | yes | uuid |
| `payment_dismissed` | popup closed without paying | `slot_id` | Custom `PaymentDismissed` | — | uuid |
| `payment_failed` | Razorpay `payment.failed` | `code`, `reason`, `method?` | Custom `PaymentFailed` | — | uuid |
| `purchase` | order marked paid (server, `fulfilOrder`) and thank-you page (browser) | `value: 499`, `currency: 'INR'`, `order_id`, `slot_id`, `content_ids:['webinar_nov_2026']`, `content_type:'product'`, `num_items:1` | Std `Purchase` on thank-you | **server** sends `Purchase` | `purchase_<orders.id>` (deterministic) |
| `thank_you_view` | thank-you page load | `status` | — | — | uuid |
| `whatsapp_join_click` | Join WhatsApp button | — | Custom `JoinWhatsApp` | yes | uuid |
| `calendar_add_click` | calendar button | `type: google \| ics` | — | — | uuid |
| `template_download_click` | bonus download | — | — | — | uuid |
| `invoice_view_click` | invoice link | — | — | — | uuid |
| `outbound_click` | any `<a>` to another origin or legal page | `href`, `text` | — | — | uuid |
| `exit_intent` | desktop mouse leaves top / mobile back on landing (only if WS2 builds the nudge) | `action: shown \| clicked \| dismissed` | — | — | uuid |
| `web_vital` | LCP, CLS, INP, FCP, TTFB (`web-vitals` lib, once each) | `metric`, `value`, `rating` | — | — | uuid |
| `client_error` | `window.onerror` / unhandled rejection (max 5 per page view) | `message`, `source`, `line` | — | — | uuid |

Adding an event later = add it to `taxonomy.ts` (name, Zod props schema, Meta mapping). `/api/events` rejects names not in the taxonomy.

### Common props sent with every browser event (added by the tracker)
`event_id`, `name`, `occurred_at` (ISO), `visitor_id`, `session_id`, `path`, `page_title`, `referrer` (first event of session), `viewport` (`390x844`), `utm` (from `gz_attr`), `fbc`, `fbp`.

## Client tracker (`src/lib/tracking/client.ts`, client-only)
```ts
export function track(name: EventName, props?: Record<string, unknown>, opts?: { eventId?: string }): string
// returns the event_id used
```
1. `eventId = opts?.eventId ?? crypto.randomUUID()`.
2. If the taxonomy maps the event to Meta: `fbq('track' | 'trackCustom', metaName, metaProps, { eventID: eventId })`. Queue calls until `fbq` exists.
3. Push to an in-memory queue; flush every 2 s, at 10 events, and on `visibilitychange: hidden` / `pagehide` using `navigator.sendBeacon('/api/events', JSON body as text/plain)`; fall back to `fetch(..., { keepalive: true })`.
4. Never throws, never blocks UI.

`TrackingRoot` (client component in root layout) sets up: session cookie, Pixel script (`next/script` `afterInteractive`, `fbq('init', PIXEL_ID)` then `PageView` with an event_id from `track('page_view')`), scroll depth, `SectionObserver` (IntersectionObserver on `[data-section]`), engaged-time heartbeat, outbound click delegate, `web-vitals`, error handlers. On the landing page it also fires `view_content`.

`PurchasePixel({ orderId, valuePaise, slotId })` (client component used by WS2 on the paid thank-you page) calls `track('purchase', {...}, { eventId: 'purchase_' + orderId })` once (guarded by `sessionStorage`). The browser `purchase` event is stored with `source: 'browser'`; the server one already exists with the same `event_id` in `events`, so the insert is skipped by the unique index — this is intended (the server record wins). The browser Pixel call still fires, and Meta dedups it with the CAPI one.

**Advanced matching after lead:** when the order API succeeds, the sheet calls `setPixelUserData({ em, ph, fn, ln, external_id })` which runs `fbq('init', PIXEL_ID, { em, ph, fn, ln, external_id })` (Pixel hashes them in the browser). `external_id` = visitor ID.

## Ingest API: `POST /api/events` (WS4)
- Body: `{ events: BrowserEvent[] }`, max 20 per request, max 32 KB. Accepts `text/plain` (sendBeacon) and `application/json`.
- Validate each with the taxonomy's Zod schema; drop invalid ones silently (count them in a log line).
- Bot filter: UA matches a bot regex (`bot|crawl|spider|preview|facebookexternalhit|WhatsApp|lighthouse|headless`) → store with `is_bot=true`, never send to CAPI.
- Rate limit: 120 events per visitor per minute.
- Upsert `visitors` (first_touch on insert, last_seen, device/os/browser from UA, country).
- Insert into `events` with `ON CONFLICT (event_id) DO NOTHING`, `source='browser'`, server-captured `ip`, `user_agent`; `occurred_at` clamped to ±10 min of server time.
- For events whose taxonomy entry says `capi: true`: build the CAPI payload and insert into `capi_outbox` (`ON CONFLICT DO NOTHING`).
- Always respond `204`.

## Server events: `recordServerEvent()` (`src/lib/tracking/server.ts`)
```ts
recordServerEvent(input: {
  name: 'lead' | 'purchase';
  eventId: string;
  orderId: string;
  customerId: string;
  valuePaise?: number;
}): Promise<void>   // never throws
```
Loads order + customer + visitor; inserts `events` row (`source='server'`, internal name `lead_submit` for `lead`, `purchase` for `purchase`) and a `capi_outbox` row with full user data from the order's attribution snapshot (IP, UA, fbc, fbp captured at checkout, so a webhook-time Purchase still has the buyer's browser data). Then tries an immediate send of that one outbox row (2 s timeout); on failure the worker retries.

## CAPI payload (`src/lib/tracking/capi.ts`)
`POST https://graph.facebook.com/${META_GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${META_CAPI_ACCESS_TOKEN}`
```json
{
  "data": [{
    "event_name": "Purchase",
    "event_time": 1793600000,
    "event_id": "purchase_3f1c…",
    "action_source": "website",
    "event_source_url": "https://genzyclub.tech/",
    "user_data": {
      "em": ["<sha256 lowercase trimmed email>"],
      "ph": ["<sha256 digits incl. 91, e.g. 919876543210>"],
      "fn": ["<sha256 lowercase first name>"],
      "ln": ["<sha256 lowercase last name>"],
      "country": ["<sha256 'in'>"],
      "external_id": ["<sha256 visitor_id>"],
      "client_ip_address": "103.x.x.x",
      "client_user_agent": "Mozilla/5.0 …",
      "fbc": "fb.1.1793…AbCd",
      "fbp": "fb.1.1793….123456789"
    },
    "custom_data": {
      "currency": "INR", "value": 499,
      "content_ids": ["webinar_nov_2026"], "content_type": "product",
      "content_name": "Live webinar seat", "order_id": "GZ-7K3P9Q", "num_items": 1
    }
  }],
  "test_event_code": "TEST12345"
}
```
- `event_time` = when it happened (seconds), never older than 7 days.
- Hashing in `hash.ts`: SHA-256 hex of normalised values. IP, UA, fbc, fbp are **not** hashed.
- For anonymous browser events (no customer yet) `user_data` has `external_id`, IP, UA, fbc, fbp only; once `visitors.customer_id` is set (after lead), later events also include em/ph/fn/ln.
- `test_event_code`: setting `capi_test_event_code` if non-empty, else env `META_TEST_EVENT_CODE`, else omitted.
- `value` is in rupees (499), converted from paise.

## Dedup rules (why Meta counts each event once)
Meta merges a browser and a server event when **`event_name` and `event_id` match** (within 48 h). So:
- Every browser event that also goes to CAPI uses the same id on both sides: the browser generates it, passes it to `fbq(..., { eventID })` **and** sends it in the beacon; the server forwards that exact id.
- `Lead`: the browser makes `leadEventId`, fires Pixel `Lead` with it, sends it in the order request; the server sends CAPI `Lead` with it.
- `Purchase`: both sides compute `purchase_<orders.id>` independently, so no handoff is needed even if the browser never reaches the thank-you page.
- Our own `events` table dedups on `event_id` too, so a retried beacon is stored once.

## Outbox worker job (`registerCapiJob()` in `src/lib/tracking/capi.ts`, run by `scripts/worker.ts` every 5 s)
1. `SELECT … FROM capi_outbox WHERE status='pending' AND next_attempt_at <= now() ORDER BY id LIMIT 500 FOR UPDATE SKIP LOCKED`.
2. One CAPI request with all rows (Meta accepts up to 1000 per call).
3. 2xx → `status='sent'`, `sent_at`, `fbtrace_id`. 4xx with a per-event error → mark those `failed` with `last_error`. 5xx / network → `attempts+1`, `next_attempt_at = now() + 2^attempts minutes` (max 6 attempts, then `failed`).
4. Rows older than 7 days still pending → `failed` (Meta rejects them).

## Analytics queries (`src/lib/analytics/queries.ts`, used by WS3)
All accept `range: { from: Date; to: Date }`, exclude `is_bot`, bucket by IST. Signatures are in `09-workstreams.md`. Funnels count **unique visitors** per step within the range; purchases and revenue come from `orders` (status `paid`), never from events, so they always match Razorpay.

## Meta setup checklist (owner + WS4)
- Events Manager → create Dataset/Pixel → copy Pixel ID → `NEXT_PUBLIC_META_PIXEL_ID`.
- Settings → Conversions API → Generate access token → `META_CAPI_ACCESS_TOKEN`.
- Business settings → Brand safety → Domains → verify `genzyclub.tech` (DNS TXT in Cloudflare).
- Aggregated Event Measurement: priority Purchase > InitiateCheckout > Lead > AddPaymentInfo > ViewContent.
- Test pass: set test event code in admin, check every event in **Test events**, both "Browser" and "Server" rows, marked **Deduplicated**. Then clear the code.
- After launch: watch Event Match Quality for Purchase and Lead (target ≥ 7/10).

## Privacy
The privacy page discloses cookies, Pixel and CAPI and what is shared with Meta. Hashing before sending; raw email/phone never leave our server except to Razorpay and Resend. No tracking on `/admin`.
