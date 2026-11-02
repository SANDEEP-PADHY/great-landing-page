'use client';
import { useEffect } from 'react';
import { track } from '@/lib/tracking/client';

type Props = { orderId: string; valuePaise: number; slotId: string };

/** Fires the browser Purchase once, with the deterministic id the server also uses (Meta dedups on it). */
export function PurchasePixel({ orderId, valuePaise, slotId }: Props) {
  useEffect(() => {
    const key = `gz_purchase_${orderId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* storage blocked: still fire once per mount */ }
    track(
      'purchase',
      { value: valuePaise / 100, currency: 'INR', order_id: orderId, slot_id: slotId },
      { eventId: `purchase_${orderId}` },
    );
  }, [orderId, valuePaise, slotId]);
  return null;
}
