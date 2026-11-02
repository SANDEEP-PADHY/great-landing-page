import type { PriceView, PublicSettings } from './contracts';

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2 }).format(rupees);
}

export function getPriceView(s: Pick<PublicSettings, 'offer_price_paise' | 'regular_price_paise' | 'offer_ends_at'>, now: Date): PriceView {
  const isOffer = now.getTime() <= new Date(s.offer_ends_at).getTime();
  return {
    pricePaise: isOffer ? s.offer_price_paise : s.regular_price_paise,
    regularPaise: s.regular_price_paise,
    offerEndsAt: s.offer_ends_at,
    isOffer,
  };
}

export function getCurrentPricePaise(s: Pick<PublicSettings, 'offer_price_paise' | 'regular_price_paise' | 'offer_ends_at'>, now = new Date()): number {
  return getPriceView(s, now).pricePaise;
}
