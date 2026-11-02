'use client';

import { splitMs } from './format';
import { useLanding } from './LandingProvider';

/** Live countdown to `offer_ends_at`. variant "full" = 02d 03h 04m 05s, "dh" = 02d 03h. */
export function Countdown({ variant = 'full' }: { variant?: 'full' | 'dh' }) {
  const { now, offerEndsMs } = useLanding();
  const c = splitMs(offerEndsMs - now);
  return (
    <span className="tnum" suppressHydrationWarning>
      {variant === 'full' ? `${c.d}d ${c.h}h ${c.m}m ${c.s}s` : `${c.d}d ${c.h}h`}
    </span>
  );
}
