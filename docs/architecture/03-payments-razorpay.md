# 03: Payments — Razorpay Order, Verify, Webhook

Owner: **WS1** (server). **WS2** builds the checkout sheet UI that calls these endpoints.

## Principles
1. The browser never decides the price or the paid status. The server computes the amount, creates the Razorpay Order, and marks an order paid only after a valid signature (verify) or a valid webhook.
2. The **webhook is the source of truth.** `verify` is the fast path for a nice redirect; if the buyer closes the tab, the webhook still fulfils.
3. Fulfilment is **idempotent**: `fulfilOrder()` can be called any number of times; side effects run once.

## Sequence
```
Browser (CheckoutSheet)           Next.js server                      Razorpay
──────────────────────            ──────────────                      ────────
open sheet → track InitiateCheckout
submit form (slot,name,phone,email,leadEventId)
  ── POST /api/checkout/order ──▶ validate (Zod)
                                  check sales_open, slot open, price
                                  upsert customer (by phone)
                                  razorpay.orders.create ─────────────▶ order_XXXX
                                  insert orders (pending) + attribution
                                  recordServerEvent('lead') → CAPI Lead
  ◀── { razorpayOrderId, amount, keyId, prefill, publicId } ──
new Razorpay(options).open() → track AddPaymentInfo ─────────────────▶ popup (UPI/card/NB)
                                                                       buyer pays
  ◀────────────── handler({payment_id, order_id, signature}) ──────────
  ── POST /api/checkout/verify ─▶ HMAC check
                                  fulfilOrder(order_id, payment_id, 'verify')
  ◀── { redirect: '/thank-you?o=GZ-…&t=…' }
location.assign(redirect)
                                  ◀── POST /api/webhooks/razorpay ──── payment.captured / order.paid
                                  verify X-Razorpay-Signature
                                  dedup X-Razorpay-Event-Id
                                  fulfilOrder(order_id, payment_id, 'webhook')  (no-op if already paid)
```

## Endpoints (contracts; Zod schemas live in `src/lib/contracts.ts`)

### `POST /api/checkout/order`
Request:
```ts
type CreateOrderRequest = {
  slotId: 's7' | 's8' | 's9' | 's10';
  name: string;          // 2–80 chars, trimmed
  phone: string;         // exactly 10 digits, /^[6-9]\d{9}$/
  email: string;         // valid email, lowercased
  leadEventId: string;   // uuid generated in browser, used for Lead dedup
};
```
Server reads attribution from cookies (`gz_vid`, `gz_attr`, `_fbc`, `_fbp`) and IP/UA from headers. It does not trust any attribution fields in the body.

Response `200`:
```ts
type CreateOrderResponse = {
  publicId: string;            // 'GZ-7K3P9Q'
  razorpayOrderId: string;     // 'order_…'
  amount: number;              // paise, e.g. 49900
  currency: 'INR';
  keyId: string;               // RAZORPAY_KEY_ID
  prefill: { name: string; email: string; contact: string }; // contact '+91…'
  description: string;         // 'Live webinar seat · Sat 7 Nov, 7–9 PM IST'
};
```
Errors: `400 { error: 'validation', fields }`, `409 { error: 'slot_closed' }`, `410 { error: 'sales_closed' }`, `429 { error: 'rate_limited' }`, `502 { error: 'payment_provider' }`.

Logic (`createCheckoutOrder()` in `src/lib/orders.ts`):
1. `sales_open` setting must be true. Slot must exist, `is_open`, and `now < starts_at`.
2. Amount = `getCurrentPricePaise(now)`: `offer_price_paise` if `now <= offer_ends_at`, else `regular_price_paise`.
3. Reuse rule: if the same phone has a `pending` order for the same slot and amount created in the last 30 minutes, return that order's Razorpay order (avoids piling up orders when someone retries).
4. `razorpay.orders.create({ amount, currency: 'INR', receipt: publicId, notes: { publicId, slotId, phone } })`.
5. Insert `orders` row with attribution snapshot and `leadEventId`. Link `visitors.customer_id`.
6. Call `recordServerEvent({ name: 'lead', eventId: leadEventId, orderId, customerId })` (WS4; stubbed in M0). Must not throw; wrap in try/catch.
7. Rate limit: 10 requests per IP per 10 minutes (in-memory, single process).

### Browser: opening Checkout (WS2, `src/components/checkout/useRazorpay.ts`)
- Load `https://checkout.razorpay.com/v1/checkout.js` lazily when the sheet first opens (not on page load, to protect LCP).
- Options:
```ts
{
  key: res.keyId, order_id: res.razorpayOrderId, amount: res.amount, currency: 'INR',
  name: 'GenZy Club', description: res.description, image: '/uploads/<logo>' ,
  prefill: res.prefill, theme: { color: '#1D4ED8' },
  notes: { publicId: res.publicId },
  handler: (r) => POST /api/checkout/verify,
  modal: { ondismiss: () => track('payment_dismissed'), confirm_close: true },
  retry: { enabled: true },
}
```
- `rzp.on('payment.failed', (e) => track('payment_failed', { code: e.error.code, reason: e.error.reason }))`, then show an inline "Payment failed, try again" with the same order.
- Fire `track('payment_open')` right after `rzp.open()`.

### `POST /api/checkout/verify`
Request: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
Check: `HMAC_SHA256(order_id + '|' + payment_id, RAZORPAY_KEY_SECRET) === signature` using `crypto.timingSafeEqual`.
On success: `fulfilOrder({ razorpayOrderId, razorpayPaymentId, source: 'verify' })`, respond `{ ok: true, redirect: '/thank-you?o=<publicId>&t=<token>' }`.
On bad signature: `400 { error: 'bad_signature' }` and log. The webhook will still fulfil a genuine payment.

### `GET /api/checkout/status?o=<publicId>&t=<token>`
Returns `{ status: 'pending' | 'paid' | 'failed', slot: { dayLabel, dateLabel } }`. Used by the thank-you page to poll every 2 s (max 30 s) when it loads before the order is marked paid.

### `POST /api/webhooks/razorpay`
- Read the **raw** body: `const raw = await req.text()`. Verify `X-Razorpay-Signature === HMAC_SHA256(raw, RAZORPAY_WEBHOOK_SECRET)` (hex, timing-safe). Bad signature → `400`.
- Insert into `payment_events` with `X-Razorpay-Event-Id`; on unique conflict return `200` immediately (duplicate delivery).
- Handle:
  | Event | Action |
  |---|---|
  | `payment.captured` | `fulfilOrder({ razorpayOrderId: p.order_id, razorpayPaymentId: p.id, method: p.method, source: 'webhook' })` |
  | `order.paid` | same, using `payload.order.entity.id` and `payload.payment.entity.id` |
  | `payment.failed` | set `orders.last_failure_reason` (status stays `pending`, the buyer can retry) |
  | anything else | store only |
- Set `processed_at` (or `error`). Always answer `200` within ~1 s once the signature is valid; Razorpay retries non-2xx.
- Configure in Razorpay Dashboard → Webhooks: URL `https://genzyclub.tech/api/webhooks/razorpay`, events `payment.captured`, `payment.failed`, `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`. Separate secrets for test and live mode.
- Dashboard → Payment capture settings: **automatic capture** on, so payments are captured (not just authorized).

## `fulfilOrder()` (the single place that marks paid)
```ts
async function fulfilOrder(input: {
  razorpayOrderId: string; razorpayPaymentId: string; method?: string; source: 'verify' | 'webhook';
}): Promise<{ order: Order; firstTime: boolean }>
```
1. `UPDATE orders SET status='paid', razorpay_payment_id=$2, payment_method=$3, paid_at=now(), updated_at=now() WHERE razorpay_order_id=$1 AND status <> 'paid' RETURNING *`.
2. If no row returned → already paid (or unknown order: log + return). `firstTime = false`, stop.
3. If `firstTime`, run side effects, each in its own try/catch, none blocking the response for long:
   - `sendOrderConfirmation(orderId)` (WS1 email) → sets `confirmation_sent_at`.
   - `recordServerEvent({ name: 'purchase', eventId: 'purchase_' + order.id, orderId, customerId, valuePaise: amount })` (WS4).
   - `sendAdminSaleAlert(orderId)` if enabled.
4. If the slot has already started when the payment lands (rare), keep the slot; the admin sees a "late payment" badge and can move the buyer.

## Signed public tokens (`src/lib/tokens.ts`)
`token(publicId) = base64url(HMAC_SHA256(publicId, APP_SECRET)).slice(0, 22)`. Required on `/thank-you`, `/invoice/[publicId]`, `/api/checkout/status`, `/api/calendar/[publicId]`, `/api/download/template`. Stops anyone from enumerating buyers' names.

## Other WS1 helpers used by other streams
| Function | Used by |
|---|---|
| `getOrderReceipt(publicId, token)` → order + customer + slot, or null | WS2 thank-you, invoice |
| `changeOrderSlot(orderId, slotId)` | WS3 buyer detail |
| `resendConfirmation(orderId)` | WS3 |
| `sendSlotReminder(slotId)` → `{ sent, failed }` | WS3 slots page, worker |

## Test vs live
- Test mode keys (`rzp_test_…`) until Razorpay activates the account. Test UPI ID `success@razorpay`, test cards from Razorpay docs.
- Switching to live = change the three Razorpay env vars + add the live webhook, then `pm2 reload genzy-web`. No code change.
- No refunds by policy; any exception is done manually in the Razorpay dashboard. A `refund.processed` webhook is not needed for launch.
