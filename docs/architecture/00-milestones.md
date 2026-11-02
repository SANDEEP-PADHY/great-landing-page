# 00: Milestones

Order requested by the owner: **landing page → admin panel → Meta Pixel + Conversions API**. The four workstreams in `09-workstreams.md` build in parallel, but each milestone below is a delivery gate in that order.

**How we build (owner's rule):** do not stop to test after every step. Each workstream completes all its build steps, runs only `pnpm typecheck && pnpm lint && pnpm build` at the end, and opens its PR. Real testing happens in **two passes** after everything is merged (M4 and M5).

Dates assume today is Mon 2 Nov 2026 and the first webinar is Sat 7 Nov.

---

## M0: Foundation (WS1, first, ~half a day)
The skeleton every other workstream rebases onto.
- [ ] Next.js 15 + TS + pnpm scaffold, ESLint, Prettier, `tsconfig` paths (`@/`)
- [ ] `src/lib/env.ts` (Zod-validated env), `.env.example`
- [ ] Drizzle setup, full schema from `02-database.md`, first migration, `scripts/seed.ts` (4 slots + default settings)
- [ ] `src/lib/contracts.ts` and the stub modules listed in `09-workstreams.md` (tracking stubs, email stub) so other streams compile
- [ ] `src/lib/settings.ts`, `src/lib/media.ts`, `src/lib/slots.ts`, `src/lib/pricing.ts` (read side)
- [ ] PM2 `ecosystem.config.cjs`, Nginx config, `deploy/deploy.sh`
- **Done when:** PR merged to the base branch. Other workstreams rebase.

## M1: Landing page sells (WS2 + WS1)
Split in three because Razorpay must review a live site before it activates live keys.

### M1a: Site live for Razorpay review (target: Mon 2 Nov night / Tue 3 Nov morning)
- [ ] VPS provisioned, domain on Cloudflare, SSL, app running under PM2 (WS1)
- [ ] Landing page ported from the design, all sections, placeholders for images (WS2)
- [ ] Legal pages: About, Contact, Pricing, Terms, Privacy, Refund Policy (WS2)
- [ ] Footer links to all six; earnings and bonus disclaimers present (WS2)
- **Done when:** https://genzyclub.tech loads with all pages, and the owner can submit it to Razorpay.

### M1b: Checkout works in Razorpay test mode
- [ ] Checkout sheet (slot, name, WhatsApp, email) with validation (WS2)
- [ ] `POST /api/checkout/order`, `POST /api/checkout/verify`, `GET /api/checkout/status` (WS1)
- [ ] Razorpay webhook with signature check, idempotent `fulfilOrder()` (WS1)
- [ ] Thank-you page with WhatsApp button, calendar add, template download, order ID (WS2)
- [ ] Invoice page (WS2) backed by `getOrderReceipt()` (WS1)
- [ ] Confirmation email via Resend, domain verified (WS1)
- [ ] Abandoned-checkout email job, slot reminder email function (WS1)

### M1c: Live keys
- [ ] Swap to live Razorpay keys + live webhook secret when Razorpay approves (owner + WS1)

## M2: Admin panel (WS3)
- [ ] Login, session, rate limit, guarded `/admin/*` and `/api/admin/*`
- [ ] Dashboard: revenue, sales, funnel, campaigns, per slot, recent sales (charts read from WS4 analytics functions)
- [ ] Buyers database: search, filter, CSV export, buyer detail with full journey timeline, change slot, mark watched full / bonus given, resend confirmation
- [ ] Abandoned checkouts with WhatsApp click-to-chat
- [ ] Slots: open/close, webinar link per slot, send reminder email to a slot
- [ ] Content & media: upload/replace/remove each image slot, template file upload
- [ ] Settings: WhatsApp community link, contact email/phone, prices, offer end, sales open, email toggles
- [ ] Emails log and Tracking health pages

## M3: Meta Pixel + Conversions API, full activity tracking (WS4)
- [ ] Visitor/session cookies and first/last-touch attribution (UTM, fbclid, `_fbc`, `_fbp`) in middleware
- [ ] Client tracker `track()` with batching + `sendBeacon`, auto events (page view, scroll depth, section views, engaged time, web vitals, errors, outbound clicks)
- [ ] Meta Pixel loader with advanced matching after lead
- [ ] `POST /api/events` ingest, bot filter, rate limit
- [ ] CAPI sender with outbox, retries, hashing, `test_event_code` support
- [ ] Server-side `Lead` and `Purchase` from WS1 hooks with deterministic dedup IDs
- [ ] Analytics query library used by the admin dashboard
- [ ] Events Manager checklist: domain verified, dedup showing, Event Match Quality checked

## M4: Integration test pass 1 (all, after every PR is merged; target Wed 4 Nov)
Run the full checklist in `09-workstreams.md` → "Test pass 1" on the live server in **Razorpay test mode** with CAPI `test_event_code` on. Log every bug in one list, fix them in one batch.

## M5: Test pass 2 and go-live (target Thu 5 Nov)
- [ ] Re-run the failed items from pass 1
- [ ] Live keys on, one real ₹499 payment end to end, refund it from the Razorpay dashboard
- [ ] Go-live checklist from `../plan/06-launch-timeline.md` all ticked
- [ ] Owner starts ads
