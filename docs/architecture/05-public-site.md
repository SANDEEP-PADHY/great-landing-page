# 05: Public Site — Landing, Checkout, Thank-you, Legal

Owner: **WS2**. Source of truth for look and copy: `docs/design/landing-page.dc.html` (desktop artboard, responsive; the mobile artboard renders the same file at 390 px).

## Porting the design
The design file is a self-contained page: a `<style>` block with `.nm` classes, inline-styled markup with `{{holes}}`, and a `renderVals()` script holding the data arrays.
- Copy the `<style>` block into `src/styles/landing.css` (scope stays under `.nm`). Keep keyframes (`nmRise`, `nmFloat`, `nmShine`, `nmPulse`, `nmMarquee`, `nmReveal`) and the `prefers-reduced-motion` block.
- Move the arrays from `renderVals()` (`steps`, `learn`, `forYes`, `forNo`, `stack`, `faqRaw`, ticker `tick`) into `src/content/landing.ts`.
- Convert inline `style="…"` to JSX style objects or small CSS classes; do not redesign. `{{sl.*}}`, `{{f.*}}` etc. become props.
- Interactivity in the design (`openSheet`, `pick`, `toggle`, countdown, ₹ counter) becomes small client components; everything else is a Server Component.

### Design tokens (from the file)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#D9DCE2` | page background |
| `--surface` | `#F4F5F7` | cards, sticky bar |
| `--inset` | `#E3E6EB` | pressed / selected |
| `--ink` | `#0E1013` | headings, text |
| `--ink-2` | `#2F343C` | body text |
| `--ink-3` | `#474D57` | secondary |
| `--accent` | `#1D4ED8` | links, selected, focus ring, pulse |
| `--cta` | `#F27321` | primary buttons |
| shadow raised | `10px 10px 24px #AEB3BD, -8px -8px 20px #F2F3F6` | `.raised` |
| fonts | Inter Tight 600–800 (display), Inter 400–700 (body) | |
| breakpoint | `900px` | mobile ↔ desktop |

## Landing page sections (top → bottom), with component, data and tracking
`section` = the id sent with `section_view` (see `07-tracking-pixel-capi.md`). Each section root gets `data-section="<id>"`; WS4's `SectionObserver` does the rest.

| # | Component | `section` id | Dynamic data | Tracking calls WS2 adds |
|---|---|---|---|---|
| 1 | `TopBar` (sticky top): "DIWALI OFFER · Ends in {d}d {h}h {m}m {s}s", logo, **`ClaimPill`** "Free Claude · Claim now" | `topbar` | `offer_ends_at` | pill → `cta_click {location:'claim_pill'}` then open sheet |
| 2 | `Hero`: eyebrow, hook "I was asleep…", "₹1 lakh in a week.", lead, hero portrait, ₹ counter badge, Claude bonus card, "What you get for ₹499" card, price ₹499 ~~₹2,499~~ "Save 80% · till 10 Nov", CTA, Razorpay trust line | `hero` | prices, media `hero`, `claude_logo` | CTA → `cta_click {location:'hero'}` |
| 3 | `Ticker` marquee | `ticker` | `tick` array | none |
| 4 | `Proof`: Razorpay dashboard image, ₹1L / 1 week / 1 ebook stats, disclaimer | `proof` | media `proof` | `media_click {key:'proof'}` if image tapped |
| 5 | `Steps`: "Set it up once. It sells every day." Idea → Create → Automate → Sell | `system` | `steps` | none |
| 6 | `Learn`: "Most people learn AI. You'll earn with it." 6 items | `learn` | `learn` | none |
| 7 | `ForYou`: yes / no lists | `for_you` | `forYes`, `forNo` | none |
| 8 | `Host`: photo, Sandeep Padhy story | `host` | media `host` | none |
| 9 | `Bonus`: "Pay ₹499. Get ₹2,000 back." Claude card, Bonus 1 template, How to claim 3 steps, Anthropic disclaimer | `bonus` | `claude_bonus_value`, media `claude_logo` | none |
| 10 | `PriceBlock` + `SlotPicker`: everything for ₹499, stack list, 4 slot cards (closed slots greyed, "Selected"), CTA "Book {date} · ₹499" | `pricing` | slots, prices | slot card → `slot_select {slot_id, location:'pricing'}`; CTA → `cta_click {location:'pricing'}` |
| 11 | `Faq` accordion (8 items) | `faq` | `faqRaw` | open → `faq_open {index, question}` |
| 12 | `FinalCta`: "Light more than diyas this Diwali." countdown, CTA | `final_cta` | `offer_ends_at` | CTA → `cta_click {location:'final'}` |
| 13 | `Footer`: Terms · Privacy · Refund policy · Contact · email, disclaimers, © | `footer` | `contact_email` | links → `outbound_click` (auto by WS4) |
| — | `StickyBar` (sticky bottom, all widths): ₹499 ~~₹2,499~~, "Ends in", Claude line (desktop), "Book my seat" | — | prices | `cta_click {location:'sticky_bar'}` |
| — | `CheckoutSheet` (modal bottom sheet) | — | slots, price | see below |

All CTAs and the pill open the same `CheckoutSheet` with the currently selected slot.

## Server data for the page
`src/app/(site)/page.tsx` is a Server Component with `export const revalidate = 300` and tag `site`:
```ts
const [settings, media, slots] = await Promise.all([getPublicSettings(), getMediaMap(), getSlots()]);
const price = getPriceView(settings, new Date()); // { pricePaise, regularPaise, offerEndsAt, isOffer }
```
Slot open/closed and the countdown are recomputed **in the browser** every second from `startsAt`/`offerEndsAt`, so a cached page never shows a stale open slot. The server still rejects closed slots at order time.

Media rendering: `<SiteImage k="hero" />` uses `media[k]` (WebP `srcset`, width/height to avoid CLS) or the placeholder `/placeholders/<k>.svg` with the design's label ("Hero portrait · Sandeep at desk · 3:4"). Hero image is `priority`/`fetchpriority="high"`; everything else `loading="lazy"`.

### Media keys (`MediaKey` in contracts)
`hero` (3:4, 1200×1600) · `proof` (Razorpay screenshot) · `host` (host photo) · `claude_logo` · `bonus_template_cover` (optional) · `og_image` (1200×630) · `logo` · `favicon` · `bonus_template_file` (kind `file`, private).

### Metadata
`generateMetadata()`: title "Live Webinar: ₹1 lakh in 7 Days with an Automated Digital Product | GenZy Club", description, Open Graph + Twitter image from `og_image`, `themeColor #D9DCE2`, favicon from `favicon` media. `robots`: index the landing and legal pages; `noindex` thank-you, invoice, admin.

## URL parameters
- `?slot=s8` preselects a slot (used by the abandoned email). Ignore if closed.
- UTM / fbclid are handled by WS4 middleware; WS2 does nothing with them.

## Checkout sheet (`src/components/checkout/CheckoutSheet.tsx`)
Fields exactly as in the design: date chips (open slots only), Full name, WhatsApp number with fixed `+91` prefix (`inputmode="numeric"`, 10 digits, starts 6–9), Email (`type="email"`, `autocomplete="email"`). Button "Pay ₹499 securely". Small print "UPI, cards or netbanking via Razorpay. ₹499 is the final amount. No refunds."

Flow:
1. On open: `track('checkout_open', { location, slot_id })` (WS4 maps it to Pixel `InitiateCheckout`).
2. On field blur with a valid value: `track('form_field_complete', { field })`. On invalid submit: `track('form_error', { field, code })`.
3. Submit: generate `leadEventId = crypto.randomUUID()`, `track('lead_submit', { slot_id }, { eventId: leadEventId })` (Pixel `Lead` with the same id; the server sends CAPI `Lead`), then `POST /api/checkout/order` with `leadEventId`.
4. Error mapping: `slot_closed` → refresh slot chips and ask to pick another; `sales_closed` → show "Bookings closed"; `validation` → inline field errors; others → "Something went wrong, try again".
5. Open Razorpay (see `03-payments-razorpay.md`). `payment_open`, `payment_dismissed`, `payment_failed` tracked there.
6. On verify success → `location.assign(redirect)`. Button shows a spinner and is disabled from submit until redirect.
- Accessibility: focus trap, `Esc` closes, `aria-modal`, labels on all inputs, 44 px targets.
- Back button on mobile closes the sheet (push a history state on open).

## Thank-you page (`/thank-you?o=&t=`)
Server loads `getOrderReceipt(o, t)`. Invalid token → generic "Order not found" page with contact email.
- **Paid:** "✅ Seat confirmed for Sat 7 Nov, 7 PM" · big **Join WhatsApp Community** button (`whatsapp_link`; if empty: "Link is on its way to your email") · Add to Google Calendar + Download .ics · Download free landing page template (`/api/download/template?o=&t=`) · "Webinar link comes on WhatsApp + email before the session" · Claude bonus reminder · order ID · invoice link.
- **Pending:** "Confirming your payment…" and poll `/api/checkout/status` every 2 s up to 30 s, then `router.refresh()`. After 30 s: "Payment is processing. You'll get an email within a few minutes."
- Tracking: `thank_you_view {status}`; when paid, `PurchasePixel` fires browser Pixel `Purchase` with `eventID = 'purchase_' + order.id` (the order UUID, passed as a prop) — WS4 component, WS2 renders it. Button clicks: `whatsapp_join_click`, `calendar_add_click {type}`, `template_download_click`, `invoice_view_click`.
- `noindex`, no sticky bar, no countdown.

## Legal pages (needed for Razorpay activation, M1a)
Shared layout: simple header (logo → `/`), readable prose (Tailwind typography), same footer. Content uses `contact_email` / `contact_phone` from settings.
| Route | Must contain |
|---|---|
| `/about` | GenZy Club, host Sandeep Padhy, what we sell (live educational webinars), contact |
| `/contact` | email, phone (if set), response time, "We reply within 24 hours" |
| `/pricing` | Live webinar seat: ~~₹2,499~~ ₹499 Diwali offer until 10 Nov 2026, then ₹2,499; what's included; final price, not registered under GST |
| `/terms` | service description, eligibility, payment via Razorpay, slot choice, conduct, IP, disclaimers (earnings + bonus + not affiliated with Anthropic/Meta), limitation of liability, governing law India |
| `/privacy` | data collected (name, phone, email, payment metadata from Razorpay, device/usage data), cookies and **Meta Pixel / Conversions API** disclosure, purposes, sharing (Razorpay, Resend, Meta), retention, rights and contact (India DPDP Act 2023 language) |
| `/refund-policy` | No refunds. If GenZy Club cancels a session, switch batch free or full refund within 7 working days |

## Performance budget (hard)
- LCP < 2.0 s on mid Android over 4G; CLS < 0.05; INP < 200 ms.
- Landing JS < 90 KB gzipped (no chart libs, no Razorpay script, no animation libs on load). Pixel loads `afterInteractive`.
- Fonts via `next/font` with `display: swap`, only the weights used.
- Hero image ≤ 120 KB WebP at 1280w; all others lazy.
- CSS animations only; respect `prefers-reduced-motion`.
