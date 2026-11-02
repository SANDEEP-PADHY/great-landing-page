# 05: Ads and Tracking

## Tracking setup (before any ad runs)
1. Create **Meta Business Manager** + ad account + Facebook page + Instagram account linked.
2. Create a **Meta Pixel (Dataset)**. Add to the page.
3. **Conversions API** from our server for `Purchase` (more accurate than browser-only, survives ad blockers / iOS).
4. Events: `PageView`, `ViewContent`, `InitiateCheckout` (modal open), `AddPaymentInfo` (Razorpay opens), `Purchase` (value 499, INR).
5. Verify the domain genzyclub.tech in Business Manager.
6. All ad links carry UTM tags: `?utm_source=meta&utm_campaign=webinar_nov&utm_content=video_A`, so the admin panel shows which video sells.

## Campaign plan
- **Objective:** Sales, optimise for `Purchase` (switch to `InitiateCheckout` for the first 1 to 2 days if purchases are too few for Meta to learn).
- **Audience:** India, 18 to 35, broad (Advantage+), Hindi + English speakers. Let the creative do the targeting.
- **Placements:** Instagram Reels + Stories + Facebook Reels (vertical videos).
- **Structure:** 1 campaign → 1 ad set → 3 to 4 ads (videos A to D).
- **Budget:** ₹3,000 total. Day 1: ₹500 to learn, then shift budget to the best ad. Rough split: ₹500 day 1, ~₹600/day after, stop when ₹3,000 is spent.
- **Rules:** after ₹250 spent on an ad with 0 checkouts, pause it. Scale the winner by ~20%/day.
- **Retargeting:** skip at this budget; follow up abandoned checkouts manually on WhatsApp instead (free).
- **Hook theme:** "Is Diwali, apni life badlo" + ~~₹2,499~~ ₹499 Diwali offer.

## Ad policy safety (Meta is strict on "make money" ads)
- Say "my result", never "you will earn ₹1.4L".
- Earnings disclaimer on the landing page.
- No fake screenshots, no "guaranteed income".
- Avoid using "Claude" or other brand names as the main hook in ads.
