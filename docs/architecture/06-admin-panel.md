# 06: Admin Panel

Owner: **WS3**. Lives at `https://genzyclub.tech/admin`. Desktop first, but every page must work on the owner's phone (tables scroll horizontally inside a box, filters stack).

UI: Tailwind v4 + a few hand-made components (Card, Stat, Table, Badge, Button, Input, Drawer, Toast). Charts: Recharts. Same blue accent `#1D4ED8`, neutral greys, no neumorphism needed. All times shown in IST.

## Auth
- Single owner. Credentials from env: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (bcrypt, cost 12; generate with `pnpm tsx scripts/hash-password.ts`).
- `/admin/login`: email + password form → server action → `bcrypt.compare` → set cookie `gz_admin` = JWT (`jose`, HS256, `ADMIN_JWT_SECRET`, `sub: 'owner'`, 7-day expiry), `HttpOnly; Secure; SameSite=Strict; Path=/`.
- Rate limit: 5 failed attempts per IP per 15 min → 429 with a wait message (in-memory map; one web process). Log failures to `admin_audit`.
- Guard: `src/middleware.ts` `adminGuard()` verifies the JWT for `/admin/*` (except `/admin/login`) and `/api/admin/*`; redirect to login or 401. Every server action and admin route handler also calls `requireAdmin()` (defence in depth).
- Logout clears the cookie. `X-Robots-Tag: noindex` on all admin responses.

## Navigation
Sidebar (collapses to a top menu on mobile): Dashboard · Buyers · Abandoned · Analytics · Slots · Content & media · Settings · Emails · Tracking · Logout.
Global date-range picker (Today · Yesterday · Last 7 days · All time · Custom) stored in the URL (`?range=7d` or `?from=&to=`), used by Dashboard and Analytics.

## Pages

### Dashboard (`/admin`)
Data comes from WS4's `src/lib/analytics/queries.ts` (signatures in `09-workstreams.md`). Server Components, `dynamic = 'force-dynamic'`.
- **KPI tiles:** Revenue (range) · Sales (range) · Revenue today · Visitors (unique) · Visitor → Purchase conversion % · Checkout → Purchase % · Avg sales/day · Abandoned (range).
- **Revenue & sales by day** (bar + line, IST days).
- **Funnel** (unique visitors per step + step conversion %): `page_view` → `cta_click` → `checkout_open` → `lead_submit` → `payment_open` → `purchase`.
- **Sales per slot**: 4 bars + counts, so the owner knows batch sizes.
- **Campaigns table** grouped by `utm_campaign` / `utm_content` (which ad video wins): visitors, CTA clicks, checkouts, sales, revenue, conversion %, sorted by sales. "(direct)" for no UTM.
- **Live now**: visitors with an event in the last 5 minutes, refreshes every 30 s (client poll of `/api/admin/live`).
- **Recent sales feed**: last 10 paid orders (name, slot, amount, utm_content, time ago).

### Buyers (`/admin/buyers`)
- Table of paid orders joined with customer and slot: Name · Phone · Email · Slot · Amount · Payment ID · Method · Source (utm_source/utm_content) · Paid at · Watched full · Bonus given.
- Search box (name, phone, email, public ID, payment ID), filters (slot, status incl. pending/failed, date range, watched full). Server-side pagination 50/page via URL params.
- **Export CSV** (`GET /api/admin/export/buyers?…same filters`) streams `name,phone,email,slot,amount,status,public_id,payment_id,utm_source,utm_campaign,utm_content,paid_at`. Phones exported as `+91…` for WhatsApp broadcast and webinar.gg invites. One-click "Export this slot" on the Slots page uses the same route.
- **Buyer detail** (`/admin/buyers/[orderId]`): customer card with copy buttons and a `wa.me` link; order and payment details; attribution (first touch from `visitors`, last touch on the order); **journey timeline** from `getVisitorJourney(visitorId)` (every event with time, section, props); emails sent (`email_log`). Actions (each writes `admin_audit`):
  - Change slot (dropdown) → `changeOrderSlot()` (WS1)
  - Toggle watched full / bonus given
  - Resend confirmation email → `resendConfirmation()` (WS1)
  - Admin note

### Abandoned (`/admin/abandoned`)
Pending orders older than 15 minutes where the same phone has no paid order. Columns: Name · Phone · Email · Slot · Created · Abandon email sent · Last failure reason · Contacted. Actions: **WhatsApp** button (`https://wa.me/91XXXXXXXXXX?text=` prefilled "Hi {first name}, aapka GenZy Club webinar seat ({slot}) abhi book nahi hua. Yeh raha link: https://genzyclub.tech/?slot=…") and **Mark contacted**. CSV export.

### Analytics (`/admin/analytics`)
Deeper views for "all user activity", all from WS4 query functions:
- Traffic sources (utm_source/medium/campaign, referrer domains), device / OS / browser split, country split.
- Scroll depth distribution (25/50/75/90/100 %) and section engagement (views and avg visible time per section, in page order).
- CTA clicks by location (hero, sticky_bar, pricing, final, claim_pill).
- FAQ opens by question.
- Form drop-off: per-field completion and errors in the checkout sheet.
- Payment outcomes: opened, dismissed, failed by reason, succeeded; methods split.
- Engagement: median engaged time, % visitors reaching 30 s / 60 s / 120 s.
- Hourly heatmap of visits and sales (IST hour × day).
- Web vitals p75 (LCP, CLS, INP) by device.
- **Events explorer**: table of raw events with filters (name, visitor ID, date) and a link to that visitor's journey.

### Slots (`/admin/slots`)
Per slot: date/time, Open/Closed (auto closed after start; manual toggle `is_open`), buyers count, revenue, **Webinar link** input (webinar.gg URL), **Send reminder email** button (confirm dialog; shows sent/failed counts; calls `sendSlotReminder()`), **Export CSV**. Saving revalidates tag `site`.

### Content & media (`/admin/content`)
Grid of cards, one per `MediaKey`, each showing the current image (or placeholder), recommended size, alt text field, **Upload / Replace** and **Remove**.
- Upload route `POST /api/admin/media/[key]` (multipart, max 8 MB, `image/jpeg|png|webp`). `processUpload()` in `src/lib/media.ts`: `sharp` → auto-rotate, strip metadata, resize to widths per key (`hero`: 640/1280, `proof`: 640/1280, `host`: 480/960, `claude_logo`: 128/256, `og_image`: 1200 exact JPEG for social, `logo`: 256/512, `favicon`: 32/180/512 PNG) → WebP q80 → write `UPLOAD_DIR/<key>-<hash8>-<w>.webp` → upsert `media` row → delete the previous files → `revalidateTag('site')`.
- **Bonus template file**: upload PDF/ZIP/HTML up to 25 MB into `PRIVATE_DIR` (not web-served); buyers download through `/api/download/template` with their token.

### Settings (`/admin/settings`)
One form, grouped, Zod-validated, each save writes `site_settings`, `admin_audit`, and `revalidateTag('site')`:
- **WhatsApp community link** (must start with `https://chat.whatsapp.com/`) — used by thank-you page and every email immediately.
- **Contact**: email, phone — used by contact page, footer, emails.
- **Pricing**: offer price (₹), regular price (₹), offer ends at (IST datetime). Shows a preview "Buyers now pay ₹499".
- **Sales open** master switch (closing shows "Bookings closed" on the page and blocks `/api/checkout/order`).
- **Claude bonus value** text ("₹2,000").
- **Emails**: abandoned email on/off + delay, admin sale alert on/off, auto slot reminder on/off.

### Emails (`/admin/emails`)
`email_log` table: time, to, template, status, error, order link. "Retry" on failed rows.

### Tracking (`/admin/tracking`)
From `getCapiHealth()`: Pixel ID, CAPI sent / pending / failed (24 h), last error with `fbtrace_id`, events received per hour, dedup pairs seen. **Test event code** field (writes `capi_test_event_code`) and **Send test event** button (sends a CAPI `PageView` with the test code) for Meta Events Manager → Test events.

## Admin API routes (`src/app/api/admin/*`, all `requireAdmin()`)
| Route | Purpose |
|---|---|
| `POST /api/admin/media/[key]` · `DELETE …/[key]` | upload / remove media |
| `GET /api/admin/export/buyers` · `GET /api/admin/export/abandoned` | CSV |
| `GET /api/admin/live` | live visitor count + last events |
| `POST /api/admin/capi-test` | send CAPI test event |
Other mutations are server actions in the page files.
