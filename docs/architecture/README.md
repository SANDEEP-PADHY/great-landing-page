# GenZy Club Webinar: Code Architecture

**Status:** Approved for build · **Written:** 2 Nov 2026 · **Domain:** genzyclub.tech · **Host:** Hostinger KVM 1 VPS

This folder is the build spec. Every build thread reads this README, `00-milestones.md`, `09-workstreams.md`, and then the docs for its own workstream. The business plan (offer, copy intent, ads) lives in `../plan/`. The final visual design lives in `../design/landing-page.dc.html` (exported from the design canvas, including the floating "Free Claude · Claim now" pill).

## What the system does
One Next.js app on one VPS that:
1. Serves a single fast landing page that sells a ₹499 live webinar seat (4 slots, 7 to 10 Nov 2026, 7 to 9 PM IST).
2. Takes payment through Razorpay Standard Checkout (Orders API, signature verify, webhook as source of truth).
3. Sends confirmation and reminder emails through Resend.
4. Gives the owner an admin panel: sales and funnel dashboard, buyers database, abandoned checkouts, content and media uploads, WhatsApp link and contact settings.
5. Tracks every visitor action in our own `events` table and mirrors the funnel events to Meta through the Pixel (browser) and the Conversions API (server), deduplicated by a shared `event_id`.

## Documents
| # | Doc | Read it if you own |
|---|---|---|
| 00 | [Milestones](00-milestones.md) | everyone |
| 01 | [Stack and folder structure](01-stack-and-structure.md) | everyone |
| 02 | [Database schema](02-database.md) | everyone (WS1 owns the file) |
| 03 | [Payments: Razorpay order, verify, webhook](03-payments-razorpay.md) | WS1, WS2 |
| 04 | [Emails: Resend](04-emails-resend.md) | WS1, WS3 |
| 05 | [Public site: landing, checkout, thank-you, legal](05-public-site.md) | WS2 |
| 06 | [Admin panel](06-admin-panel.md) | WS3 |
| 07 | [Tracking: event taxonomy, Pixel, CAPI, dedup](07-tracking-pixel-capi.md) | WS4, WS2 |
| 08 | [Hosting and deploy on Hostinger KVM 1](08-hosting-deploy.md) | WS1 |
| 09 | [Workstreams, shared contracts, merge and test plan](09-workstreams.md) | everyone |

## Decisions in one table
| Area | Decision |
|---|---|
| App | Next.js 15 (App Router) + React 19 + TypeScript, one app for site, API and admin |
| Runtime | Node 22 LTS, pnpm, PM2 (2 processes: `web` and `worker`) |
| DB | PostgreSQL 16 on the same VPS, Drizzle ORM + drizzle-kit migrations |
| Validation | Zod on every API input and on env vars |
| Payments | Razorpay Orders API + Standard Checkout popup + webhook (`payment.captured`, `order.paid`, `payment.failed`) |
| Email | Resend + React Email templates, from `hello@genzyclub.tech`, reply-to `genzyclub.com@gmail.com` |
| Admin auth | Single owner account from env (bcrypt hash), signed JWT cookie, IP rate limit |
| Images | Uploaded in admin, resized to WebP with `sharp`, served by Nginx from `/uploads` with immutable cache |
| Tracking | Own `events` table (all activity) + Meta Pixel + Conversions API via an outbox, `event_id` dedup |
| Edge | Cloudflare (proxy, SSL Full strict, WAF skip for the Razorpay webhook path) |
| Server | Ubuntu 24.04, Nginx reverse proxy, Postgres local only, nightly off-box backups |
| Time | Everything stored in UTC (`timestamptz`), every display and daily bucket in `Asia/Kolkata` |
| Money | Integer paise everywhere (`49900` = ₹499). Price always computed on the server |

## Where the design overrides the plan docs
The design canvas is final, so where it differs from `../plan/02-page-structure-and-copy.md`, the design wins:
- Slot days are **Sat 7, Sun 8, Mon 9, Tue 10 Nov** (2026 calendar). The plan doc's "Fri 7 Nov" is wrong.
- Page copy is **English** with light Hinglish, exactly as in the design file's markup and its `renderVals()` arrays.
- The Claude subscription is shown as **"worth ₹2,000"** with its own logo media slot.
- The header has a pulsing **"Free Claude · Claim now"** pill that opens the checkout sheet.
- Visual system: neumorphic light grey (see tokens in `05-public-site.md`), blue accent `#1D4ED8`, orange CTA `#F27321`, Inter + Inter Tight.
