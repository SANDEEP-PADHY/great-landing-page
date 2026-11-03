'use client';

import type { CSSProperties, ReactNode } from 'react';
import { track } from '@/lib/tracking/client';
import { useLanding, type SheetLocation } from './LandingProvider';

/** Any "book" button. Fires cta_click, then opens the shared checkout sheet. */
export function CtaButton({
  location,
  className = 'btn-cta cta raised',
  style,
  children,
}: {
  location: SheetLocation;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { openSheet, selectedId, salesOpen } = useLanding();
  const closed = !salesOpen || !selectedId;
  return (
    <button
      type="button"
      className={className}
      style={style}
      disabled={closed}
      onClick={() => {
        track('cta_click', { location, slot_id: selectedId ?? undefined });
        openSheet(location);
      }}
    >
      {closed ? (salesOpen ? 'All sessions closed' : 'Bookings closed') : children}
    </button>
  );
}
