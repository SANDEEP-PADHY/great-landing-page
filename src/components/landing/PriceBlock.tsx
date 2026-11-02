import { STACK } from '@/content/landing';
import { PricingCta } from './PricingCta';
import { SlotPicker } from './SlotPicker';
import type { PriceCopy } from './format';

export function PriceBlock({ p, bonusValue }: { p: PriceCopy; bonusValue: string }) {
  return (
    <div data-section="pricing" className="wrap sec" style={{ paddingTop: 0 }}>
      <div className="raised" style={{ maxWidth: 720, margin: '0 auto', borderRadius: 32, padding: '34px 21px', background: '#F4F5F7', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h2 className="disp h2" style={{ margin: 0, fontWeight: 800, textAlign: 'center' }}>Everything for {p.now}</h2>
        <div style={{ alignSelf: 'center', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#FFFFFF', background: '#1D4ED8', borderRadius: 999, padding: '8px 16px' }}>
          Includes a {bonusValue} Claude subscription, free
        </div>
        <div className="inset" style={{ borderRadius: 20, padding: '6px 18px' }}>
          {STACK.map((it, i) => (
            <div key={it} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: i === STACK.length - 1 ? undefined : '1px solid #D3D6DC' }}>
              <svg style={{ flex: 'none', marginTop: 4 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
              <span>{it}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12 }}>
          {p.isOffer && <span style={{ fontSize: 22, color: '#474D57', textDecoration: 'line-through' }}>{p.regular}</span>}
          <span className="disp price-xl" style={{ fontWeight: 800, lineHeight: 1 }}>{p.now}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700 }}>Choose your date <span style={{ fontWeight: 400, color: '#2F343C', fontSize: 14 }}>· 7–9 PM IST</span></div>
          <SlotPicker />
        </div>
        <PricingCta />
        <div style={{ fontSize: 13, color: '#2F343C', textAlign: 'center' }}>WhatsApp group link right after payment. No refunds.</div>
      </div>
    </div>
  );
}
