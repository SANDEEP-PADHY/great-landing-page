# AI image prompts for every placeholder

Nov 2, 2026 · Living version: https://claude.ai/artifact/HqpJxEcQZNYgffVjoVgLaA

The site has 8 image slots (see `src/lib/admin/media-specs.ts`). You can generate 5 with AI (hero, host photo, logo, favicon, share image) and 1 optional one (bonus cover). Two must not be AI images: the Razorpay proof must be your real screenshot, and the Claude logo must be the official file.

## How to use this

**Prepare these reference images once and reuse them:**

1. **Face set (3 to 5 selfies)**: one straight-on, one 3/4 left, one 3/4 right, one smiling, one neutral. Daylight from a window, no sunglasses, no filters, no beauty mode, plain background. This is what keeps your face the same across every image.
2. **Outfit photo (optional)**: you wearing the outfit you want in every image. A plain black crew-neck t-shirt or a charcoal overshirt fits the black, white and grey palette best.
3. **The generated hero image**: once you like it, use it as an extra reference for the host photo and the share image so all three look like one shoot.

**Which tool for which image:** Nano Banana is better at keeping your face identical, so use it for the hero, host and share image. ChatGPT is better at clean lettering, so use it for the logo and favicon, and as a backup for the share image text.

**Sizes:** pick the aspect ratio named in each prompt. ChatGPT only offers square, 2:3 portrait and 3:2 landscape, so use the closest one and crop. Always pick the largest size offered. The admin crops and resizes on upload, so a slightly bigger image is fine; a smaller one will look soft.

**Face lock line.** Every prompt with you in it already contains this, but if a result drifts, paste it again as a follow-up:

```text
Use the man in the attached reference photos as the only person. Keep his exact face, face shape, skin tone, beard, hairline and hairstyle. Do not beautify, slim, whiten or change his ethnicity or age. Photorealistic, natural skin texture.
```

**Shared style.** All images follow the site design: minimal neumorphic look, soft light grey surfaces (#E3E6EB to #F4F5F7), near-black ink (#0E1013), one royal blue accent (#1D4ED8) and one warm orange accent (#F27321). Diwali shows up as a few small warm diya lights or orange bokeh, never as a busy festive collage.

## Landing page images

### 1. Hero portrait (`hero`)

**Size:** 3:4 portrait, upload 1200×1600 or larger. Nano Banana: choose 3:4. ChatGPT: choose 2:3 portrait and crop to 3:4.

**Where it shows:** top of the page, next to the "₹1.4 lakh. 7 days. Fully automated." headline. A floating "₹1,40,000 in 7 days" card sits over the bottom-left corner, so keep that corner empty.

**Upload with the prompt:** your 3 to 5 face selfies, plus the outfit photo if you have one.

```text
Use the man in the attached reference photos as the only person. Keep his exact face, face shape, skin tone, beard, hairline and hairstyle. Do not beautify, slim, whiten or change his ethnicity or age.

Photorealistic editorial portrait, 3:4 vertical. A young Indian creator and founder sits at a clean minimal desk at night, upper body and face in frame, slight 3/4 angle, relaxed confident half-smile, looking just past the camera. He wears a plain black crew-neck t-shirt. On the desk: an open silver laptop whose screen glows soft blue with an out-of-focus sales dashboard (no readable numbers), and a smartphone lying face up, its screen lit with a stack of blurred payment notifications.

Background: smooth matte light grey wall (#E3E6EB), almost empty. Two or three small brass diya oil lamps far in the background, out of focus, giving warm orange bokeh (#F27321) on the right side only. Soft key light from the left, gentle shadows, calm premium mood, subtle neumorphic softness, low clutter.

Composition: subject centred slightly right, head in the upper third, bottom-left quarter of the frame kept plain and empty. Colour palette strictly black, white, soft greys, with one blue glow and small orange accents. 85mm lens look, shallow depth of field, sharp eyes, natural skin texture. No text, no logos, no watermark.
```

**If it goes wrong:** if the face drifts, reply "Keep the same image, but match the face exactly to the reference photos." If the room looks busy, reply "Remove everything except the desk, laptop, phone and the diya bokeh."

### 2. Host photo (`host`)

**Size:** 1:1 square, upload 1200×1200 (at least 960×960). Both tools: choose square.

**Where it shows:** the "Your host: Sandeep Padhy" card. This one should feel warmer and more personal than the hero.

**Upload with the prompt:** your face selfies plus the final hero image (so lighting and outfit match).

```text
Use the man in the attached reference photos as the only person. Keep his exact face, face shape, skin tone, beard, hairline and hairstyle. Do not beautify, slim, whiten or change his ethnicity or age. Match the outfit and lighting of the attached hero image.

Photorealistic square portrait, 1:1. Waist-up, facing the camera directly, warm genuine smile, arms loosely crossed or one hand resting on the edge of a desk. Plain black crew-neck t-shirt.

Background: seamless soft light grey studio backdrop (#E3E6EB to #F4F5F7) with a very soft round shadow behind him, like a raised neumorphic surface. One small out-of-focus orange (#F27321) diya glow low in the right corner, nothing else. Soft window light from the left, gentle fill, premium personal-brand feel, calm and trustworthy.

Subject centred, eyes on the upper third line, a little headroom. 50mm lens look, sharp eyes, natural skin. No text, no logos, no watermark.
```

### 3. Razorpay proof screenshot (`proof`): do not use AI

**Size:** 16:9 landscape, upload 1600×900 (at least 1280 wide). The frame crops to 16:9, so crop it yourself first so nothing important is cut.

**What to upload:** a real screenshot of your Razorpay dashboard showing the ₹1.4 lakh over 7 days. Blur or black out customer names, emails, phone numbers and payment IDs before uploading.

This must be a real screenshot. An AI-generated or edited earnings image is fake income proof: Meta rejects ads that use it, and it breaks ASCI advertising rules in India. If you want a cleaner look, take the screenshot in Razorpay's light mode, crop to the earnings chart and total, and zoom the browser to 125% before capturing so the numbers are crisp.

### 4. Claude logo (`claude_logo`): do not use AI

**Size:** square, 256×256 PNG with a transparent background.

**Where it shows:** inside the orange tile on the "FREE Claude subscription worth ₹2,000" card.

Use the official Claude logo from Anthropic's brand or press assets, not an AI copy. Because it sits on an orange tile, use the black (#0E1013) or white single-colour version of the mark, not the orange one, or it will disappear. Leave about 10% empty space around the mark.

### 5. Bonus template cover (`bonus_template_cover`): optional

**Size:** 4:3 landscape, upload 1600×1200. Nano Banana: choose 4:3. ChatGPT: choose 3:2 and crop.

The page does not show this image yet, so it is the lowest priority. Make it only if you want it ready for the email or a later page update.

**Upload with the prompt:** a full-page screenshot of your actual landing page template (so the mockup shows the real thing).

```text
Place the attached website screenshot onto the screen of a modern silver laptop. Keep the screenshot content exactly as it is; do not redraw, rewrite or invent any text on the screen.

Premium product mockup, 4:3 landscape. The laptop sits at a slight 3/4 angle on a soft light grey neumorphic surface (#E3E6EB), with a matching rounded raised panel behind it casting a soft shadow. A smartphone leans beside the laptop showing the mobile version of the same page. One small orange (#F27321) diya glow in the far background corner, out of focus. Studio lighting, soft shadows, minimal, clean, lots of empty space. No extra text, no logos, no watermark.
```

## Brand and share images

The thank-you page, checkout and legal pages have no image slots of their own. The checkout and the top bar reuse the logo below.

### 6. GenZy Club logo (`logo`)

**Size:** 1:1 square, generate 1024×1024, upload as is (the admin makes 256 and 512 versions). Use ChatGPT, square.

**Where it shows:** at 28×28 pixels with rounded corners next to the "GenZy Club" name in the top bar, and on the Razorpay payment popup. At that size only a bold, simple mark survives, so it is a monogram, not the full wordmark.

**Upload with the prompt:** nothing needed. If you already have a GenZy Club logo or colours, upload it and add "Base it on the attached logo".

```text
Design a minimal app-icon style logo mark for a brand called "GenZy Club", a creator-education brand for young Indians learning to sell digital products with AI.

Square 1:1, 1024x1024. A single bold geometric monogram "GZ" (or just "G" if "GZ" gets crowded), heavy rounded sans-serif in the style of Inter Tight ExtraBold, in near-black (#0E1013), centred on a soft light grey (#F4F5F7) rounded-square tile with a subtle neumorphic raised effect (soft light highlight top-left, soft shadow bottom-right). One small accent: a solid orange (#F27321) dot, like a spark or diya flame, placed at the top-right of the letters. Flat, crisp vector look, perfectly centred, generous padding around the letters.

It must stay readable at 28x28 pixels: no thin lines, no gradients inside the letters, no extra words, no tagline, no mockup, no 3D render, no watermark.
```

**Check before uploading:** shrink it on your phone to the size of an app icon. If you cannot read it instantly, ask "Make the letters thicker and remove the tile effect".

### 7. Favicon (`favicon`)

**Size:** square PNG, 1024×1024 (at least 512×512). The admin makes 32, 180 and 512 versions.

**Where it shows:** the browser tab and the phone home-screen icon.

**Upload with the prompt:** the logo you just made in step 6.

```text
Turn the attached logo into a favicon. Square 1:1, 1024x1024, PNG.

Keep the same letterform but simplify it for 16 to 32 pixel display: a solid near-black (#0E1013) rounded-square background filling the whole canvas, the monogram in white (#FFFFFF), extra thick, filling about 60% of the square, with the small orange (#F27321) dot kept at the top-right. Completely flat: no neumorphic shadow, no gradient, no border, no texture, no extra text.
```

### 8. Social share image (`og_image`)

**Size:** exactly 1200×630 (1.91:1). Nano Banana: choose 16:9. ChatGPT: choose 3:2 landscape. The admin cover-crops to 1200×630, which trims a little off the top and bottom, so the prompt keeps text away from the edges.

**Where it shows:** the preview card when the link is shared on WhatsApp, Facebook, Instagram DMs and X, and when Meta shows the link. On WhatsApp it often appears small, so the headline must be huge.

**Upload with the prompt:** the final hero image (for your face and lighting) and 2 face selfies.

```text
Use the man in the attached photos as the only person. Keep his exact face, skin tone, beard and hairstyle. Do not beautify or change his ethnicity or age. Match the outfit and lighting of the attached hero image.

Create a social media share banner, 16:9 landscape, minimal premium neumorphic design.

Right 40%: the man from the reference, chest-up, black crew-neck t-shirt, confident half-smile, looking at the camera, cut out cleanly against the background, with one soft out-of-focus orange (#F27321) diya glow behind his shoulder.

Left 60%: smooth soft light grey background (#E3E6EB) with large bold sans-serif text in the style of Inter Tight ExtraBold, left aligned, exactly these words and nothing else:
Line 1, small, in a near-black rounded pill with white letters: LIVE WEBINAR
Line 2, huge, near-black (#0E1013): ₹1.4 lakh.
Line 3, huge, near-black: 7 days.
Line 4, huge, royal blue (#1D4ED8): Fully automated.
Line 5, small, dark grey: 7–10 Nov · 7–9 PM IST
Top-left corner, small orange (#F27321) rounded tag with near-black text: DIWALI OFFER

Keep all text inside the middle 80% of the height, with clear empty margin at the top and bottom. Spell every word exactly as written, keep the rupee symbol ₹. Lots of empty space, no extra icons, no logos, no watermark, no other text.
```

**If the text comes out wrong:** AI often misspells or mangles the ₹ symbol. Ask once for a fix; if it is still wrong, regenerate with "Same image, but with no text at all on the left side", then add the five lines yourself in Canva using Inter Tight ExtraBold and the same colours.

## Upload checklist

Upload each file in the admin under **Content & media**, in the card with the matching label. Make them in this order, because later images use earlier ones as references.

| Order | Admin card | Source | Size to upload | References to attach |
| --- | --- | --- | --- | --- |
| 1 | Hero portrait | AI, Nano Banana | 1200×1600, 3:4 | 3 to 5 selfies, outfit photo |
| 2 | Host photo | AI, Nano Banana | 1200×1200, 1:1 | Selfies + final hero |
| 3 | Social share image | AI, Nano Banana (text fix in Canva if needed) | 1200×630 | Final hero + 2 selfies |
| 4 | Logo | AI, ChatGPT | 1024×1024, 1:1 | None (or your existing logo) |
| 5 | Favicon | AI, ChatGPT | 1024×1024 PNG | The logo from step 4 |
| 6 | Razorpay proof screenshot | Real screenshot, blurred | 1600×900, 16:9 | Not AI |
| 7 | Claude logo | Official Anthropic file | 256×256 transparent PNG | Not AI |
| 8 | Bonus template cover (optional) | AI mockup | 1600×1200, 4:3 | Screenshot of your template |

After uploading, open the live page on your phone and check three things: your face is not cut off in the hero, nothing sits under the floating ₹1,40,000 card, and the share preview looks right when you send the link to yourself on WhatsApp (WhatsApp caches previews, so test with `?v=2` on the end of the link).
