import type { MediaMap } from '@/lib/contracts';
import { CtaButton } from './CtaButton';
import { HeroCounter } from './HeroCounter';
import { SiteImage } from './SiteImage';
import type { PriceCopy } from './format';

const ico = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function Hero({ media, p, bonusValue }: { media: MediaMap; p: PriceCopy; bonusValue: string }) {
  return (
    <div data-section="hero" className="wrap sec" style={{ paddingTop: 40 }}>
      <div className="bento">
        <div className="stack" style={{ gridArea: 'head', justifyContent: 'center', padding: '8px 4px' }}>
          <div className="rise d1" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#FFFFFF', background: '#0E1013', borderRadius: 6, padding: '5px 9px' }}>Live webinar</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>2 hours · 7–10 Nov · 7–9 PM IST</span>
          </div>
          <div className="rise d1 disp hook" style={{ fontWeight: 600, color: '#2F343C', maxWidth: 460 }}>I was asleep. My phone kept buzzing with payments.</div>
          <h1 className="disp rise d2" style={{ margin: 0, fontWeight: 800 }}>
            <span className="t1">₹1 lakh</span>
            <span className="t2">in a week.</span>
            <span className="t3" style={{ color: '#1D4ED8' }}>Fully automated.</span>
          </h1>
          <p className="lead rise d3" style={{ margin: 0, color: '#2F343C', maxWidth: 560 }}>
            Join my 2-hour live webinar and learn to build and sell your own digital product on autopilot. I&apos;ll set up the exact system that made me ₹1 lakh, step by step. No inventory. No team. No code.
          </p>
        </div>

        <div className="rise d2" style={{ gridArea: 'photo', alignSelf: 'center', position: 'relative', padding: '0 0 21px 0' }}>
          <div className="raised" style={{ aspectRatio: '3 / 4', borderRadius: 28, background: '#F4F5F7', padding: 12, display: 'flex' }}>
            <div className="inset" style={{ flex: 1, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
              <SiteImage media={media} k="hero" priority sizes="(min-width: 900px) 40vw, 90vw" />
            </div>
          </div>
          <div className="raised float" style={{ position: 'absolute', left: -12, bottom: 0, background: '#F4F5F7', borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', background: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="#FFFFFF" strokeWidth="3" {...ico}><path d="M5 12l5 5 9-10" /></svg>
            </span>
            <div style={{ lineHeight: 1.15 }}>
              <div className="disp" style={{ fontWeight: 800, fontSize: 26 }}><HeroCounter /></div>
              <div style={{ fontSize: 13, color: '#2F343C', fontWeight: 600 }}>in a week · fully automated</div>
            </div>
          </div>
        </div>

        <div className="rise d3 d-raised" style={{ gridArea: 'bonus', borderRadius: 24, background: '#0E1013', color: '#F4F5F7', padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="bn-logo" style={{ flex: 'none', borderRadius: 14, background: 'var(--cta)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <svg width="55%" height="55%" viewBox="0 0 24 24" stroke="#0E1013" strokeWidth="2" {...ico}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="disp bn-title" style={{ fontWeight: 800, lineHeight: 1.2 }}>
              <span>FREE landing page template</span><br /><span style={{ color: '#9DB8FF' }}>{bonusValue ? `worth ${bonusValue}` : 'Instant download after payment'}</span>
            </div>
          </div>
        </div>

        <div className="rise d4 raised" style={{ gridArea: 'get', borderRadius: 24, background: '#F4F5F7', padding: '8px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#474D57', padding: '12px 0 4px' }}>What you get for {p.now}</div>
          <GetRow bottom icon={<><rect x="2" y="5" width="14" height="14" rx="2" /><path d="M16 10l6-3v10l-6-3" /></>} title="1 live webinar seat" sub="Pick 7, 8, 9 or 10 Nov · 7–9 PM IST" />
          <GetRow bottom icon={<><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>} title="The full system + live Q&A" sub="Idea, AI creation, store, payments, auto delivery, traffic" />
          <GetRow last icon={<><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18" /></>} title={`FREE landing page template${bonusValue ? ` worth ${bonusValue}` : ''}`} sub="The page structure I use to sell. Instant download" />
        </div>

        <div className="rise d5 raised" style={{ gridArea: 'buy', borderRadius: 24, background: '#F4F5F7', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="disp price-xl" style={{ fontWeight: 800, lineHeight: 1 }}>{p.now}</span>
            {p.isOffer && (
              <>
                <span style={{ fontSize: 18, color: '#474D57', textDecoration: 'line-through' }}>{p.regular}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', background: '#1D4ED8', borderRadius: 6, padding: '4px 8px' }}>Save {p.save}% · till {p.till}</span>
              </>
            )}
          </div>
          <CtaButton location="hero">
            Book my webinar seat · {p.now}
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" {...ico}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </CtaButton>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '6px 16px', fontSize: 13, color: '#2F343C' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" stroke="#0E1013" strokeWidth="2" {...ico}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Secure payment by Razorpay · UPI · Cards
            </span>
            <span>Pick your date next</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GetRow({ icon, title, sub, bottom, last }: { icon: React.ReactNode; title: string; sub: string; bottom?: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: last ? '10px 0 14px' : '10px 0', borderBottom: bottom ? '1px solid #DDE0E5' : undefined }}>
      <svg style={{ flex: 'none', marginTop: 2 }} width="20" height="20" viewBox="0 0 24 24" stroke="#1D4ED8" strokeWidth="2" {...ico}>{icon}</svg>
      <span><strong>{title}</strong><br /><span style={{ fontSize: 14, color: '#2F343C' }}>{sub}</span></span>
    </div>
  );
}
