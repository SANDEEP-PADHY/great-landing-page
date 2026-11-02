# 03: Tech Architecture

## Stack (recommended)
| Part | Choice | Why |
|---|---|---|
| Framework | **Next.js** (one app: landing page + API + admin) | Fast page, server routes for Razorpay, one codebase |
| Database | **PostgreSQL** on the same VPS (SQLite is OK too for this size) | Reliable, easy admin queries |
| Payments | **Razorpay Standard Checkout** with Orders API + webhooks | Payment verified on the server, not trusting the browser |
| Email | **Resend** (from hello@genzyclub.tech, reply-to genzyclub.com@gmail.com) | Confirmation + reminder emails. Resend can't send from Gmail, so we verify the domain via DNS |
| WhatsApp | Community link on thank-you page + email. Reminders: manual broadcast at first, WhatsApp Business API later | Keeps it simple for launch |
| Server | Hostinger KVM 1 (1 vCPU, 4 GB RAM) with **Nginx + PM2 + Let's Encrypt SSL** | Enough for this traffic |
| CDN / speed | **Cloudflare** (free) in front of genzyclub.tech | Faster images, DDoS protection, hides VPS IP |
| Analytics | Meta Pixel + Conversions API, plus our own event table | Ad optimisation + admin dashboard |

## Payment flow (secure)
1. Buyer fills slot + name + phone + email → `POST /api/lead` saves a **lead** (status `pending`).
2. Server creates a **Razorpay Order** for ₹499 → returns `order_id`.
3. Razorpay popup opens on the page. Buyer pays with UPI/card/netbanking.
4. Browser sends `razorpay_payment_id`, `order_id`, `signature` to `POST /api/verify`. Server checks the **signature** with the secret key.
5. **Razorpay webhook** (`payment.captured`) also hits `/api/webhook`. This is the source of truth, so a sale is recorded even if the buyer closes the tab.
6. On success: mark order `paid`, send confirmation email, fire Meta `Purchase` event (server side), redirect to thank-you page with WhatsApp link.
7. Server checks the slot hasn't started yet before creating the order.

Secrets (`RAZORPAY_KEY_SECRET`, webhook secret, DB password) live only in a server `.env`, never in the repo.

## Database (first draft)
- **slots**: id, date, start_time, end_time, is_open (no capacity, unlimited seats)
- **customers**: id, name, phone, email, created_at
- **orders**: id, customer_id, slot_id, amount, status (`pending` / `paid` / `failed`), razorpay_order_id, razorpay_payment_id, utm_source, utm_campaign, utm_content, fbclid, created_at, paid_at
- **events**: id, session_id, type (`page_view`, `scroll_50`, `cta_click`, `checkout_open`, `payment_start`, `purchase`), utm fields, created_at
- **site_settings**: key, value (whatsapp_link, contact_email, contact_phone, price, strike_price, offer_end_date, template_file)
- **media**: slot_key (e.g. `hero`, `proof`, `about`), file_path, alt_text, updated_at
- **attendance** (later): order_id, watched_full (yes/no), bonus_given

## Admin panel (`genzyclub.tech/admin`, password protected)
**Dashboard**
- Revenue today / total, number of sales, average per day
- Sales per slot
- Funnel: visitors → CTA clicks → checkout opened → paid (conversion % at each step)
- Sales by ad campaign / creative (from UTM tags), so you see which Flow video is winning
- Abandoned checkouts (leads who didn't pay) with "copy WhatsApp number" for follow-up

**Users database**
- Table of all buyers: name, phone, email, slot, amount, payment ID, date, status
- Search, filter by slot/status, **export CSV** (for WhatsApp broadcast + webinar.gg invites)
- Manual actions: change a buyer's slot, mark "watched full" for bonus

**Content & media (no code changes needed)**
- Every image on the page is an **admin-managed slot** with a placeholder until you upload: hero portrait, proof (Razorpay screenshot), system diagram, about photo, bonus graphic, OG share image, logo/favicon
- Upload / replace / remove per slot; images auto-resized and converted to WebP for speed; stored on the VPS (`/uploads`)
- **Contact details** (email, phone) editable here; Contact page, footer and emails read from it
- **WhatsApp community link** editable here

**Settings**
- Open/close a slot, change price
- **WhatsApp community link field**: you paste/update the link here; the thank-you page and confirmation email always use the current value
- Upload/replace the free landing page template file (bonus download link)

Login: single admin account (you), strong password + rate limiting. Optionally 2FA later.

## VPS setup checklist
- Ubuntu, firewall (only 22, 80, 443), SSH key login, disable password login
- Nginx reverse proxy → Next.js on PM2
- SSL via Let's Encrypt (or Cloudflare origin certificate)
- Daily automatic database backup (off the VPS)
- DNS: genzyclub.tech → Cloudflare → VPS

## Policy pages (required by Razorpay)
Razorpay's activation checklist asks for links to: **About Us · Contact Us · Pricing · Terms & Conditions · Privacy Policy · Refund Policy**, plus a **sample invoice** (PNG/JPG/PDF) and a "does the user need to log in to pay?" answer (No). Their docs do not say a physical address is required on Contact Us. We put email (genzyclub.com@gmail.com) + phone, and add a city only if their team asks. Source: https://razorpay.com/docs/payments/dashboard/account-settings/business-website-details/

We build all six pages + a simple invoice (emailed after each purchase, also used as the sample).
