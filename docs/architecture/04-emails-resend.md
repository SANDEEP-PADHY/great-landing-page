# 04: Emails — Resend

Owner: **WS1**. WS3 triggers some sends from the admin panel through WS1 functions.

## Setup
- Resend account → add domain `genzyclub.tech` → add the SPF (TXT), DKIM (CNAME/TXT) and return-path records it shows into **Cloudflare DNS** (DNS only, grey cloud). Add DMARC: `_dmarc TXT "v=DMARC1; p=none; rua=mailto:genzyclub.com@gmail.com"`.
- From: `GenZy Club <hello@genzyclub.tech>` · Reply-To: `genzyclub.com@gmail.com` (Resend cannot send from Gmail).
- Templates are React Email components in `src/lib/email/templates/`. Plain, mobile-first, one primary button each, brand blue `#1D4ED8`. Every email also has a plain-text version (`render(..., { plainText: true })`).

## Module API (`src/lib/email/send.ts`)
```ts
sendEmail({ to, template, orderId?, subject, react, attachments? }): Promise<{ ok: boolean; id?: string }>
// writes email_log (queued → sent/failed), never throws

sendOrderConfirmation(orderId: string): Promise<void>
sendAbandonedCheckout(orderId: string): Promise<void>
sendSlotReminder(slotId: string): Promise<{ sent: number; failed: number }>
sendAdminSaleAlert(orderId: string): Promise<void>
```
M0 ships these as stubs that log and return, so WS3 can wire buttons before the real templates land.

## Templates
| Template | Trigger | Content |
|---|---|---|
| `order_confirmation` | `fulfilOrder()` first time | "✅ Seat confirmed: Sat 7 Nov, 7–9 PM IST" · big **Join WhatsApp Community** button (current `whatsapp_link`, or "we'll send the link soon" if empty) · Add to Google Calendar link + `.ics` attachment · Free landing page template download link (tokenised) · "Webinar join link comes on WhatsApp + email before the session" · Free Claude subscription rule (full attendance + claim steps at the end; not affiliated with Anthropic) · order ID, amount paid ₹499, payment ID · invoice link · "No refunds" line · contact email |
| `abandoned_checkout` | worker, pending order older than `email_abandoned_delay_min` (45), no paid order for that phone, `abandon_email_sent_at` null, slot not started, setting enabled | "Your seat for Sat 7 Nov is not booked yet" · one button back to `https://genzyclub.tech/?slot=s7&utm_source=email&utm_campaign=abandoned` · offer deadline · sent **once** per order |
| `session_reminder` | admin button "Send reminder to this slot" or worker 60 min before start if `email_auto_reminder_enabled` | "Starts at 7 PM today" · **Join webinar** button (`slots.webinar_url`) · WhatsApp link · reminder to stay till the end for the Claude bonus. Uses Resend **batch** API (100 per call). Sets `orders.reminder_sent_at`; skips buyers already sent unless admin chooses "send again" |
| `admin_sale_alert` | `fulfilOrder()` first time, if `email_admin_alert_enabled` | "New sale ₹499 · Name · Slot · utm_content" to `ADMIN_ALERT_EMAIL` |

## Calendar
- Google link: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=GenZy+Club+Live+Webinar&dates=20261107T133000Z/20261107T153000Z&details=...`
- `.ics`: `GET /api/calendar/[publicId]?t=…` returns a `VEVENT` (UTC times, `UID: <orderId>@genzyclub.tech`). Same file attached to the confirmation email.

## Invoice
No PDF library. The confirmation email links to `/invoice/[publicId]?t=…` (WS2 renders a clean printable page: GenZy Club, contact, invoice no. = publicId, date, buyer name/email/phone, "Live webinar seat · <slot>", ₹499, "Not registered under GST", payment ID, method). A screenshot of it is the sample invoice for Razorpay activation.

## Retries
The worker retries `email_log` rows with `status='failed' AND attempts < 3` every 2 minutes (re-render from the order). Resend's own idempotency key = `<template>:<orderId>` (for reminders `<template>:<orderId>:<slotId>`).
