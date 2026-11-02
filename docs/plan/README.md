# GenZy Club Webinar Landing Page: Master Plan

**Status:** Plan final, build spec in [../architecture/](../architecture/README.md) · **Last updated:** 2 Nov 2026
**Brand:** GenZy Club · **Theme:** "Is Diwali, apni life badlo" · **Domain:** genzyclub.tech · **Hosting:** Hostinger KVM 1 VPS · **Payments:** Razorpay only
**Repo (for build phase):** https://github.com/SANDEEP-PADHY/great-landing-page

## What we are building
One single landing page that sells a paid **live Hinglish webinar**: *"How I made ₹1.4 lakh in 7 days with a fully automated digital product business, and how you can build the same system."*

A visitor arrives (mostly from Meta ads), reads one page, picks a webinar slot, enters **name, phone, email**, pays with **Razorpay**, and instantly gets the **WhatsApp community link**. Behind it sits a small **admin panel** with sales, analytics and the buyer database.

## The one-line funnel
`Meta ad (Google Flow video)` → `Landing page` → `Pick slot + Name/Phone/Email` → `Razorpay checkout` → `Thank-you page + WhatsApp community link + confirmation email` → `Webinar on webinar.gg (link sent on WhatsApp + email)` → `Full attendees get the bonus`

## Facts locked in (from you)
| Item | Decision |
|---|---|
| Product | Live webinar, Hinglish, hosted by Sandeep Padhy (face + name on page) |
| Your proof product | Ebook on maximising a Claude subscription (Meta ads, websites, selling) → ₹1.4L in 7 days |
| Platform | webinar.gg (join link shared later via WhatsApp + email) |
| Slots | 7, 8, 9, 10 November 2026, 7:00 to 9:00 PM IST, buyer picks one at checkout |
| Upsells | None inside the webinar |
| Price | ~~₹2,499~~ ₹499 Diwali offer till 10 Nov, no GST |
| Seats | Unlimited |
| Recording | Provided (not highlighted) |
| Bonus | Free Claude subscription for everyone who attends the full webinar (final), claimed via a process shared at the end; sponsor-funded, zero cost |
| Free resource | Landing page template for every buyer |
| Admin-managed content | All images (placeholders until uploaded), contact details, WhatsApp link |
| Contact | genzyclub.com@gmail.com |
| Emails | Resend (sent from hello@genzyclub.tech, reply-to Gmail) |
| Ad budget | ₹3,000 total, daily spend set by day-1 metrics |
| Refunds | No refunds |
| Checkout fields | Name, Phone, Email only |
| After purchase | Join WhatsApp community link |
| Proof available | Your story + Razorpay dashboard screenshot (no testimonials yet) |
| Images | ChatGPT (Go) + Nano Banana (Google AI Pro), AI banners with your face |
| Ad videos | Google Flow |
| Admin | Sales dashboard, analytics, buyer database |

## Documents in this folder
1. [01-offer-and-pricing.md](01-offer-and-pricing.md): price, bonus economics, ad-cost math
2. [02-page-structure-and-copy.md](02-page-structure-and-copy.md): every section of the page, top to bottom, with draft Hinglish copy
3. [03-tech-architecture.md](03-tech-architecture.md): stack, Razorpay flow, database, admin panel, VPS setup
4. [04-creative-assets.md](04-creative-assets.md): image list + ChatGPT/Nano Banana prompts, Google Flow video scripts
5. [05-ads-and-tracking.md](05-ads-and-tracking.md): Meta campaign plan, Pixel + Conversions API
6. [06-launch-timeline.md](06-launch-timeline.md): day-by-day plan from today to 10 Nov
7. [07-open-questions.md](07-open-questions.md): what still needs your answer

## Biggest risks right now
1. **Time.** Today is 1 Nov, first slot is 7 Nov. That leaves ~5 days to build, get Razorpay live, and run ads. Tight but doable if Razorpay is started **today**. Diwali falls in the middle of the batches, which fits the offer theme.
2. **Razorpay approval needs the website first.** Razorpay checks your site for Terms, Privacy, Refund, Contact and Pricing pages before activating live mode. We build those first (see timeline).
3. **Ads start only after everything works end to end** (agreed).
4. **Meta ad review** can reject "make money" claims. Copy must show the ₹1.4L as *your* result, with an earnings disclaimer, not a promise.
