'use client';

import { Countdown } from './Countdown';
import { CtaButton } from './CtaButton';
import { useLanding } from './LandingProvider';
import { inr } from './format';
import { dateRangeLabel, timeRangeIST } from '@/lib/slot-format';

export function StickyBar() {
  const { price, offerLive, slots } = useLanding();
  const open = slots.filter((x) => x.open);
  const live = open.length ? `Live ${dateRangeLabel(open)}, ${timeRangeIST(open[0]!)}` : '';
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 20, background: 'rgba(244,245,247,.97)', backdropFilter: 'blur(10px)', borderTop: '1px solid #D3D6DC', padding: '12px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 'none', lineHeight: 1.15 }}>
          <div>
            <span className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{inr(price.pricePaise)}</span>{' '}
            {price.isOffer && <span style={{ fontSize: 13, color: '#474D57', textDecoration: 'line-through' }}>{inr(price.regularPaise)}</span>}
          </div>
          {offerLive && <div className="tnum" style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 700 }}>Ends in <Countdown variant="dh" /></div>}
        </div>
        <div className="sbar-copy" style={{ flex: 1, fontSize: 14, color: '#2F343C' }}>
          <strong style={{ color: '#0E1013' }}>+ Free landing page template</strong>{live && ` · ${live}`}
        </div>
        <CtaButton location="sticky_bar" className="cta raised-sm" style={{ flex: 1, maxWidth: 300, marginLeft: 'auto', height: 52, border: 0, borderRadius: 14, background: 'var(--cta)', color: '#0E1013', fontSize: 16, fontWeight: 800 }}>
          Book my seat
        </CtaButton>
      </div>
    </div>
  );
}
