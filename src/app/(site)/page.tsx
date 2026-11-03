import type { Metadata } from 'next';
import { SITE } from '@/content/landing';
import { getPublicSettings } from '@/lib/settings';
import { getSlots } from '@/lib/slots';
import { getMediaMap } from '@/lib/media';
import { getPriceView } from '@/lib/pricing';
import { TrackingRoot } from '@/components/tracking/TrackingRoot';
import { LandingProvider } from '@/components/landing/LandingProvider';
import { TopBar } from '@/components/landing/TopBar';
import { Hero } from '@/components/landing/Hero';
import { Bonus, ForYou, Host, Learn, Proof, Steps, Ticker } from '@/components/landing/StaticSections';
import { PriceBlock } from '@/components/landing/PriceBlock';
import { Faq } from '@/components/landing/Faq';
import { FinalCta } from '@/components/landing/FinalCta';
import { Footer } from '@/components/landing/Footer';
import { StickyBar } from '@/components/landing/StickyBar';
import { CheckoutSheet } from '@/components/checkout/CheckoutSheet';
import { priceCopy } from '@/components/landing/format';

export const revalidate = 300; // ISR; data layer is tagged "site" so admin edits revalidate instantly

export async function generateMetadata(): Promise<Metadata> {
  const media = await getMediaMap();
  const og = media.og_image?.src;
  const icon = media.favicon?.src;
  return {
    title: SITE.title,
    description: SITE.description,
    alternates: { canonical: '/' },
    robots: { index: true, follow: true },
    ...(icon ? { icons: { icon } } : {}),
    openGraph: {
      type: 'website',
      title: SITE.title,
      description: SITE.description,
      siteName: SITE.name,
      url: '/',
      ...(og ? { images: [{ url: og, width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description, ...(og ? { images: [og] } : {}) },
  };
}

export default async function LandingPage() {
  const [settings, media, slots] = await Promise.all([getPublicSettings(), getMediaMap(), getSlots()]);
  const now = new Date();
  const price = getPriceView(settings, now);
  const p = priceCopy(price);
  const bonus = settings.claude_bonus_value || '₹2,000';

  return (
    <LandingProvider slots={slots} price={price} salesOpen={settings.sales_open} renderedAt={now.getTime()}>
      <TrackingRoot pageType="landing" />
      <TopBar logoSrc={media.logo?.src} />
      <Hero media={media} p={p} />
      <Ticker p={p} />
      <Proof media={media} />
      <Steps />
      <Learn />
      <ForYou />
      <Host media={media} />
      <Bonus p={p} bonusValue={bonus} media={media} />
      <PriceBlock p={p} bonusValue={bonus} />
      <Faq />
      <FinalCta p={p} bonusValue={bonus} />
      <Footer email={settings.contact_email} phone={settings.contact_phone} />
      <StickyBar />
      <CheckoutSheet logoSrc={media.logo?.src} />
    </LandingProvider>
  );
}
