# 01: Stack and Folder Structure

## Stack
| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | `noUncheckedIndexedAccess` on |
| Framework | Next.js 15, App Router, React 19 | Server Components by default, client components only where needed |
| Package manager | pnpm 9 | one lockfile, commit it |
| Styling | Tailwind CSS v4 for admin and legal pages; `src/styles/landing.css` ported 1:1 from the design's `<style>` block for the landing page | keep the design's class names (`.nm`, `.raised`, `.inset`, …) so the port is mechanical |
| Fonts | `next/font/google`: Inter (400–700), Inter Tight (600–800) | self-hosted at build, no runtime Google request |
| DB | PostgreSQL 16, Drizzle ORM, `drizzle-kit` | `postgres` (postgres.js) driver |
| Validation | Zod | shared schemas in `src/lib/contracts.ts` |
| Payments | `razorpay` npm SDK (server), Checkout script `https://checkout.razorpay.com/v1/checkout.js` (browser) | |
| Email | `resend` + `@react-email/components` | |
| Images | `sharp` | WebP, 2 widths per slot |
| Auth | `jose` (JWT HS256), `bcryptjs` | no native builds needed |
| Charts (admin) | Recharts | client components inside admin only |
| IDs | `crypto.randomUUID()`; public order IDs `GZ-` + 6 chars Crockford base32 | |
| Process | PM2: `genzy-web` (next start, port 3000), `genzy-worker` (`tsx scripts/worker.ts`) | fork mode, 1 instance each (1 vCPU) |

No Redis, no queue service, no Docker. The worker polls Postgres tables (outbox pattern). This is plenty for a few thousand visitors a day.

## Folder structure
Ownership tags: **[WS1]** core & payments, **[WS2]** public site, **[WS3]** admin, **[WS4]** tracking. A workstream only creates or edits files with its tag. Shared files are listed in `09-workstreams.md`.

```
great-landing-page/
├─ docs/                               # this spec (no code)
├─ public/
│  ├─ placeholders/                    # [WS2] neutral SVG placeholders per media slot
│  └─ robots.txt                       # [WS2]
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                    # [WS2] root html, fonts, <TrackingRoot/> from WS4
│  │  ├─ (site)/
│  │  │  ├─ page.tsx                   # [WS2] landing page (ISR, tag "site")
│  │  │  ├─ thank-you/page.tsx         # [WS2]
│  │  │  ├─ invoice/[publicId]/page.tsx# [WS2] printable receipt
│  │  │  ├─ about/page.tsx             # [WS2] legal set ↓
│  │  │  ├─ contact/page.tsx
│  │  │  ├─ pricing/page.tsx
│  │  │  ├─ terms/page.tsx
│  │  │  ├─ privacy/page.tsx
│  │  │  └─ refund-policy/page.tsx
│  │  ├─ admin/
│  │  │  ├─ login/page.tsx             # [WS3]
│  │  │  └─ (panel)/                   # [WS3] layout with auth check + sidebar
│  │  │     ├─ page.tsx                # dashboard
│  │  │     ├─ buyers/page.tsx, buyers/[orderId]/page.tsx
│  │  │     ├─ abandoned/page.tsx
│  │  │     ├─ analytics/page.tsx
│  │  │     ├─ slots/page.tsx
│  │  │     ├─ content/page.tsx
│  │  │     ├─ settings/page.tsx
│  │  │     ├─ emails/page.tsx
│  │  │     └─ tracking/page.tsx
│  │  ├─ api/
│  │  │  ├─ checkout/order/route.ts    # [WS1]
│  │  │  ├─ checkout/verify/route.ts   # [WS1]
│  │  │  ├─ checkout/status/route.ts   # [WS1]
│  │  │  ├─ webhooks/razorpay/route.ts # [WS1]
│  │  │  ├─ download/template/route.ts # [WS1] buyer-only bonus file
│  │  │  ├─ calendar/[publicId]/route.ts # [WS1] .ics file
│  │  │  ├─ events/route.ts            # [WS4] browser event ingest
│  │  │  ├─ health/route.ts            # [WS1]
│  │  │  └─ admin/                     # [WS3] media upload, CSV export, etc.
│  ├─ components/
│  │  ├─ landing/                      # [WS2] Hero, Proof, Steps, Learn, ForYou, Host, Bonus, PriceBlock, Slots, Faq, FinalCta, Footer, StickyBar, ClaimPill, Countdown, Ticker
│  │  ├─ checkout/                     # [WS2] CheckoutSheet, useRazorpay
│  │  ├─ admin/                        # [WS3]
│  │  └─ tracking/                     # [WS4] TrackingRoot, PixelScript, SectionObserver
│  ├─ content/
│  │  └─ landing.ts                    # [WS2] all page copy arrays (steps, learn, faqs, stack…) from the design
│  ├─ lib/
│  │  ├─ env.ts                        # [WS1]
│  │  ├─ contracts.ts                  # [WS1] shared types + Zod schemas (see 09)
│  │  ├─ db/client.ts, db/schema.ts    # [WS1]
│  │  ├─ settings.ts                   # [WS1] get/set site settings (cached, tag "site")
│  │  ├─ media.ts                      # [WS1] read media rows; [WS3] adds processUpload()
│  │  ├─ slots.ts, pricing.ts          # [WS1]
│  │  ├─ razorpay.ts                   # [WS1] client + signature helpers
│  │  ├─ orders.ts                     # [WS1] createCheckoutOrder, fulfilOrder, changeOrderSlot, getOrderReceipt
│  │  ├─ tokens.ts                     # [WS1] signed public-order tokens
│  │  ├─ request.ts                    # [WS1] clientIp(), userAgent()
│  │  ├─ email/                        # [WS1] send.ts, templates/*.tsx
│  │  ├─ auth/                         # [WS3] session.ts, password.ts, rate-limit.ts
│  │  ├─ tracking/                     # [WS4] taxonomy.ts, client.ts, server.ts, capi.ts, hash.ts, attribution.ts
│  │  └─ analytics/queries.ts          # [WS4] functions the admin dashboard calls
│  ├─ styles/landing.css               # [WS2]
│  ├─ styles/admin.css                 # [WS3] Tailwind entry
│  └─ middleware.ts                    # [WS4] visitor/attribution cookies; [WS3] adds admin guard (one file, two clearly separated functions)
├─ scripts/
│  ├─ worker.ts                        # [WS1] loop runner; registers jobs from WS1 (emails) and WS4 (CAPI)
│  ├─ seed.ts                          # [WS1]
│  ├─ hash-password.ts                 # [WS3] prints a bcrypt hash for ADMIN_PASSWORD_HASH
│  └─ backup.sh                        # [WS1]
├─ drizzle/                            # [WS1] generated migrations
├─ deploy/                             # [WS1] nginx.conf, ecosystem.config.cjs, deploy.sh, setup-vps.md
├─ drizzle.config.ts, next.config.ts, package.json, .env.example
```

## Environment variables (`.env` on the server only, never committed)
```
# App
NODE_ENV=production
APP_URL=https://genzyclub.tech
APP_SECRET=                # 32+ random bytes, signs order tokens
DATABASE_URL=postgres://genzy:***@127.0.0.1:5432/genzy
UPLOAD_DIR=/var/www/genzyclub/uploads
PRIVATE_DIR=/var/www/genzyclub/private   # bonus template file, not web-served

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx   # same as RAZORPAY_KEY_ID (also returned by the order API)

# Resend
RESEND_API_KEY=
EMAIL_FROM="GenZy Club <hello@genzyclub.tech>"
EMAIL_REPLY_TO=genzyclub.com@gmail.com
ADMIN_ALERT_EMAIL=genzyclub.com@gmail.com

# Admin
ADMIN_EMAIL=genzyclub.com@gmail.com
ADMIN_PASSWORD_HASH=       # from scripts/hash-password.ts
ADMIN_JWT_SECRET=          # 32+ random bytes

# Meta
NEXT_PUBLIC_META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
META_GRAPH_VERSION=v24.0   # pin the current stable version at build time
META_TEST_EVENT_CODE=      # set during test passes, empty in production (admin can override)
```

## Conventions
- Server-only modules start with `import 'server-only'`.
- All route handlers validate input with the Zod schema from `contracts.ts` and return `{ error: string, fields?: Record<string,string> }` on failure.
- Money: integer paise. Format with `formatINR(paise)` from `src/lib/pricing.ts`.
- Time: `timestamptz` in DB; format with `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })`. SQL day buckets use `date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata')`.
- Phone: store E.164 (`+919876543210`). Input is 10 digits starting 6 to 9.
- Cache: landing data uses `unstable_cache(..., { tags: ['site'] })`. Any admin write to settings, media or slots calls `revalidateTag('site')`.
