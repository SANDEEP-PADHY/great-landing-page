'use client';

import { CtaButton } from './CtaButton';
import { useLanding } from './LandingProvider';
import { inr } from './format';

export function PricingCta() {
  const { selected, price } = useLanding();
  return (
    <CtaButton location="pricing">
      Book {selected ? selected.dateLabel : 'my seat'} · {inr(price.pricePaise)}
    </CtaButton>
  );
}
