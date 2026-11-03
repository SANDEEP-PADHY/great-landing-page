'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StatusResponse } from '@/lib/contracts';
import { track } from '@/lib/tracking/client';

export function ThankYouView({ status }: { status: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    track('thank_you_view', { status });
  }, [status]);
  return null;
}

/** Shown while the order is still pending: polls every 2s for up to 30s, then refreshes the page. */
export function PendingStatus({ publicId, token }: { publicId: string; token: string }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/checkout/status?o=${encodeURIComponent(publicId)}&t=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (res.ok) {
          const s = (await res.json()) as StatusResponse;
          if (s.status !== 'pending') {
            router.refresh();
            return;
          }
        }
      } catch {
        /* retry */
      }
      if (Date.now() - started >= 30_000) {
        if (!stopped) setTimedOut(true);
        return;
      }
      setTimeout(tick, 2000);
    };
    const t = setTimeout(tick, 2000);
    return () => { stopped = true; clearTimeout(t); };
  }, [publicId, token, router]);

  return (
    <div className="raised" style={{ borderRadius: 24, background: '#F4F5F7', padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      {!timedOut && <span className="spinner" aria-hidden="true" style={{ width: 32, height: 32 }} />}
      <h1 className="disp" style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
        {timedOut ? 'Payment is processing' : 'Confirming your payment…'}
      </h1>
      <p role="status" style={{ margin: 0, color: '#2F343C' }}>
        {timedOut
          ? "You'll get an email within a few minutes. If you don't, contact us with your order ID: " + publicId
          : 'Please keep this page open. This usually takes a few seconds.'}
      </p>
    </div>
  );
}

export function PrintButton() {
  return (
    <button type="button" className="btn-secondary no-print" onClick={() => window.print()} style={{ border: 0 }}>
      Print / Save as PDF
    </button>
  );
}
