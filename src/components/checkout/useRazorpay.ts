'use client';

import { track } from '@/lib/tracking/client';
import type { CreateOrderResponse, VerifyResponse } from '@/lib/contracts';

type RzpHandlerResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpInstance = { open: () => void; on: (ev: string, cb: (e: { error: { code?: string; reason?: string; metadata?: { payment_id?: string } } }) => void) => void };
type RzpCtor = new (opts: Record<string, unknown>) => RzpInstance;

declare global {
  interface Window {
    Razorpay?: RzpCtor;
  }
}

const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<void> | null = null;

/** Loads checkout.js on first use (not on page load, to protect LCP). */
export function loadRazorpay(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error('razorpay_script'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export type PayOutcome =
  | { type: 'success'; redirect: string }
  | { type: 'dismissed' }
  | { type: 'failed'; code?: string; reason?: string }
  | { type: 'verify_error' };

/** Opens the Razorpay popup for an order created by /api/checkout/order. Resolves with how it ended. */
export async function openRazorpay(
  order: CreateOrderResponse,
  ctx: { slotId: string; valuePaise: number; logoSrc?: string },
  onFailedEvent?: (o: { code?: string; reason?: string }) => void,
): Promise<PayOutcome> {
  await loadRazorpay();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('razorpay_missing');

  return new Promise<PayOutcome>((resolve) => {
    let settled = false;
    const done = (o: PayOutcome) => {
      if (settled) return;
      settled = true;
      resolve(o);
    };
    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: 'GenZy Club',
      description: order.description,
      ...(ctx.logoSrc ? { image: ctx.logoSrc } : {}),
      prefill: order.prefill,
      theme: { color: '#1D4ED8' },
      notes: { publicId: order.publicId },
      retry: { enabled: true },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          track('payment_dismissed', { slot_id: ctx.slotId });
          done({ type: 'dismissed' });
        },
      },
      handler: async (r: RzpHandlerResponse) => {
        try {
          const res = await fetch('/api/checkout/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            }),
          });
          if (!res.ok) throw new Error('verify');
          const data = (await res.json()) as VerifyResponse;
          done({ type: 'success', redirect: data.redirect });
        } catch {
          // The webhook still marks the order paid; send the buyer to a pending thank-you page.
          done({ type: 'verify_error' });
        }
      },
    });
    rzp.on('payment.failed', (e) => {
      const code = e.error?.code;
      const reason = e.error?.reason;
      track('payment_failed', { code, reason });
      onFailedEvent?.({ code, reason });
    });
    rzp.open();
    track('payment_open', { slot_id: ctx.slotId, value: ctx.valuePaise / 100 });
  });
}
