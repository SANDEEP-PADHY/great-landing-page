'use client';

import { track } from '@/lib/tracking/client';
import { Countdown } from './Countdown';
import { useLanding } from './LandingProvider';

/** Offer strip + header with the "Free template · Claim now" pill. */
export function TopBar({ logoSrc }: { logoSrc?: string }) {
  const { offerLive, openSheet, selectedId, salesOpen } = useLanding();
  return (
    <div data-section="topbar" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
      {offerLive && (
        <div
          style={{
            background: '#0E1013', color: '#F4F5F7', padding: '10px 16px', fontSize: 13, fontWeight: 600,
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '6px 12px', textAlign: 'center',
          }}
        >
          <span style={{ background: 'var(--cta)', color: '#0E1013', borderRadius: 6, padding: '2px 8px', fontWeight: 800 }}>DIWALI OFFER</span>
          <span>Ends in</span>
          <span className="tnum" style={{ fontWeight: 700 }}><Countdown /></span>
        </div>
      )}
      <div style={{ background: 'rgba(217,220,226,.94)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(14,16,19,.06)' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 12 }}>
          <div className="disp" style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="" width={28} height={28} style={{ borderRadius: 6 }} />
            ) : null}
            GenZy Club
          </div>
          {salesOpen && selectedId && (
            <button
              type="button"
              className="raised-sm"
              onClick={() => {
                track('cta_click', { location: 'claim_pill', slot_id: selectedId });
                openSheet('claim_pill');
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, borderRadius: 999,
                padding: '8px 14px', background: '#F4F5F7', color: '#0E1013', minHeight: 44, border: 0,
              }}
            >
              <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D4ED8' }} />
              Free template · <span style={{ color: '#1D4ED8' }}>Claim now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
