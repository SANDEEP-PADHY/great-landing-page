import { CtaButton } from './CtaButton';
import { Countdown } from './Countdown';
import { worth, type PriceCopy } from './format';

export function FinalCta({ p, bonusValue }: { p: PriceCopy; bonusValue: string }) {
  return (
    <div data-section="final_cta" className="wrap sec" style={{ paddingTop: 0 }}>
      <div className="d-raised" style={{ borderRadius: 32, background: '#16181D', color: '#F4F5F7', padding: '40px 22px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <h2 className="disp h2" style={{ margin: 0, fontWeight: 800 }}>Light more than diyas<br />this Diwali.</h2>
        <div style={{ fontSize: 18, color: '#F4F5F7', fontWeight: 600 }}>Two hours this week can change your next twelve months.</div>
        <div style={{ color: '#C9CDD4' }}>
          {p.isOffer ? `${p.now} until ${p.till}, with a free landing page template${worth(bonusValue)}. Then ${p.regular}.` : `${p.now} with a free landing page template${worth(bonusValue)}.`}
        </div>
        {p.isOffer && <div className="tnum" style={{ fontSize: 22, fontWeight: 700 }}><Countdown /></div>}
        <CtaButton location="final" className="btn-cta cta" style={{ maxWidth: 400 }}>Book my seat · {p.now}</CtaButton>
      </div>
    </div>
  );
}
