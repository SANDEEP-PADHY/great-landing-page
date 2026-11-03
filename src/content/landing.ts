// All landing-page copy arrays, moved 1:1 from the design's renderVals().

export const TICKER = [
  'Free Claude subscription worth ₹2,000',
  'No inventory',
  'No team',
  'No code',
  'Runs 24/7',
  'Live in Hinglish',
  '₹499 till 10 Nov',
];

export const STEPS = [
  { n: '1', title: 'Idea', body: 'Pick a product people already pay for.' },
  { n: '2', title: 'Create', body: 'Build it with AI in a day.' },
  { n: '3', title: 'Automate', body: 'Store, payment and delivery run on their own.' },
  { n: '4', title: 'Sell', body: 'Bring buyers with ads and organic content.' },
];

export const LEARN = [
  'Digital product ideas that actually sell',
  'Building your product with AI in one day',
  'Store, payments and instant delivery setup',
  'Getting traffic from Meta ads and organic',
  'Automations that sell while you sleep',
  'My exact 7-day, ₹1.4L launch breakdown',
];

export const FOR_YES = [
  'A student who wants a first online income',
  'Working and want a side income',
  'A creator with followers but no product',
];

export const FOR_NO = ['Money without doing the work', 'A recording only, with no live attendance'];

export const STACK = [
  '2-hour live webinar with Sandeep',
  'The complete automated product system',
  'Live Q&A',
  'WhatsApp community access, instantly',
  'Landing page template (bonus)',
  'FREE Claude subscription worth ₹2,000 (every full attendee)',
  'Session recording',
];

export const FAQS: [string, string][] = [
  ['Where is the webinar?', 'Live on webinar.gg. You get the WhatsApp group link right after payment. The join link comes on WhatsApp and email before your session.'],
  ['How do I get the free Claude subscription?', 'Book a seat, attend the full live session, and follow the claim steps I share at the end. It is worth ₹2,000 and free for every full attendee.'],
  ['Do I need experience?', 'No. Everything starts from zero.'],
  ['Do I need a laptop?', 'You can watch on your phone. A laptop helps when you build the system later.'],
  ['Is there a recording?', 'Yes. The free Claude subscription bonus is only for people who attend the full session live.'],
  ['Is payment safe?', 'Yes. Payments go through Razorpay: UPI, cards and netbanking. We never see your card details.'],
  ['Can I get a refund?', 'No refunds, so pick your date carefully. If we cancel a session, you can switch dates for free or get a refund.'],
  ['Is income guaranteed?', 'No. ₹1.4L in 7 days is my personal result. Yours depends on your work.'],
];

export const SITE = {
  name: 'GenZy Club',
  domain: 'genzyclub.tech',
  host: 'Sandeep Padhy',
  defaultContactEmail: 'genzyclub.com@gmail.com',
  title: 'Live Webinar: ₹1.4L in 7 Days with an Automated Digital Product | GenZy Club',
  description:
    'Join my 2-hour live webinar and learn to build and sell your own digital product on autopilot. ₹499 till 10 Nov, with a free Claude subscription worth ₹2,000.',
  contentId: 'webinar_nov_2026',
};

export const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refund-policy', label: 'Refund policy' },
  { href: '/about', label: 'About' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
];

export type CtaLocation = 'hero' | 'sticky_bar' | 'pricing' | 'final' | 'claim_pill';
