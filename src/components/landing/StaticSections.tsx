import type { MediaMap } from '@/lib/contracts';
import { FOR_NO, FOR_YES, LEARN, STEPS, TICKER } from '@/content/landing';
import { SiteImage } from './SiteImage';
import { TrackClick } from './TrackClick';
import type { PriceCopy } from './format';

const ico = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const Check = ({ size = 20, mt, color = '#1D4ED8', w = 3 }: { size?: number; mt?: number; color?: string; w?: number }) => (
  <svg style={{ flex: 'none', marginTop: mt }} width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...ico}><path d="M5 12l5 5 9-10" /></svg>
);

export function Ticker({ p }: { p: PriceCopy }) {
  const items = [...TICKER.slice(0, -1), p.isOffer ? `${p.now} till ${p.till}` : p.now];
  const loop = items.concat(items);
  return (
    <div data-section="ticker" style={{ background: '#0E1013', color: '#F4F5F7', overflow: 'hidden', padding: '16px 0' }} aria-label={items.join(', ')}>
      <div className="marquee" aria-hidden="true">
        {loop.map((t, i) => (
          <span key={i} className="disp" style={{ display: 'inline-flex', alignItems: 'center', gap: 21, padding: '0 21px', fontSize: 21, fontWeight: 800, whiteSpace: 'nowrap' }}>
            {t}
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cta)' }} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Proof({ media }: { media: MediaMap }) {
  const img = (
    <div className="inset" style={{ width: '100%', maxWidth: 820, aspectRatio: '16 / 9', borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
      <SiteImage media={media} k="proof" sizes="(min-width: 900px) 820px, 90vw" />
    </div>
  );
  return (
    <div data-section="proof" className="wrap sec" style={{ paddingTop: 0 }}>
      <div className="raised" style={{ borderRadius: 32, background: '#F4F5F7', padding: '34px 21px', display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'center', textAlign: 'center' }}>
        <div className="eyebrow">PROOF</div>
        <h2 className="disp h2" style={{ margin: 0, fontWeight: 800, maxWidth: 680 }}>Real dashboard !<br />&nbsp;Real numbers !</h2>
        {media.proof ? (
          <TrackClick event="media_click" props={{ key: 'proof' }} label="Razorpay dashboard screenshot" style={{ width: '100%', maxWidth: 820 }}>{img}</TrackClick>
        ) : img}
        <div className="g3" style={{ width: '100%', maxWidth: 820 }}>
          {[['₹1L', 'revenue'], ['1 week', 'from launch'], ['1 ebook', 'the only product']].map(([a, b]) => (
            <div key={a} className="raised-sm" style={{ borderRadius: 18, padding: 18, background: '#F4F5F7' }}>
              <div className="disp" style={{ fontSize: 30, fontWeight: 800 }}>{a}</div>
              <div style={{ fontSize: 14, color: '#2F343C' }}>{b}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#474D57' }}>My personal result. Results vary. This is education, not an income guarantee.</p>
      </div>
    </div>
  );
}

export function Steps() {
  return (
    <div data-section="system" className="wrap sec" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 30 }}>
      <h2 className="disp h2" style={{ margin: 0, fontWeight: 800 }}>Set it up once.<br /><span style={{ color: '#1D4ED8' }}>It sells every day.</span></h2>
      <div className="g4">
        {STEPS.map((s) => (
          <div key={s.n} className="raised" style={{ borderRadius: 22, padding: 22, background: '#F4F5F7', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="inset disp" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#1D4ED8' }}>{s.n}</span>
            <span className="disp" style={{ fontSize: 20, fontWeight: 800 }}>{s.title}</span>
            <span style={{ color: '#2F343C', fontSize: 15 }}>{s.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Learn() {
  return (
    <div data-section="learn" className="wrap sec" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 30 }}>
      <h2 className="disp h2" style={{ margin: 0, fontWeight: 800 }}>Most people learn AI.<br /><span style={{ color: '#1D4ED8' }}>You&apos;ll earn with it.</span></h2>
      <div className="g2">
        {LEARN.map((l) => (
          <div key={l} className="raised-sm" style={{ display: 'flex', gap: 14, alignItems: 'center', borderRadius: 16, padding: '16px 18px', background: '#F4F5F7' }}>
            <Check />
            <span style={{ fontWeight: 500 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ForYou() {
  return (
    <div data-section="for_you" className="wrap sec" style={{ paddingTop: 0 }}>
      <div className="g2">
        <div className="raised" style={{ borderRadius: 24, padding: 24, background: '#F4F5F7', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>For you if you&apos;re</div>
          {FOR_YES.map((y) => (
            <div key={y} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><Check size={18} mt={3} /><span>{y}</span></div>
          ))}
        </div>
        <div className="inset" style={{ borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Not for you if you want</div>
          {FOR_NO.map((n) => (
            <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#2F343C' }}>
              <svg style={{ flex: 'none', marginTop: 3 }} width="18" height="18" viewBox="0 0 24 24" stroke="#2F343C" strokeWidth="3" {...ico}><path d="M6 6l12 12M18 6L6 18" /></svg>
              <span>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Host({ media }: { media: MediaMap }) {
  return (
    <div data-section="host" className="wrap sec" style={{ paddingTop: 0 }}>
      <div className="raised g2" style={{ borderRadius: 32, padding: 20, background: '#F4F5F7', alignItems: 'center' }}>
        <div className="inset" style={{ aspectRatio: '1 / 1', borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
          <SiteImage media={media} k="host" sizes="(min-width: 900px) 460px, 90vw" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 6 }}>
          <div className="eyebrow">YOUR HOST</div>
          <h2 className="disp h2" style={{ margin: 0, fontWeight: 800 }}>Sandeep Padhy</h2>
          <p style={{ margin: 0, color: '#2F343C' }}>I wrote one ebook on getting the most out of AI. I set up a fully automated store, ran Meta ads, and made ₹1 lakh in a week.</p>
          <p style={{ margin: 0, color: '#2F343C' }}>In this session I rebuild that system live and answer your questions.</p>
        </div>
      </div>
    </div>
  );
}

export function Bonus({ p, bonusValue, media }: { p: PriceCopy; bonusValue: string; media?: MediaMap }) {
  return (
    <div data-section="bonus" className="wrap sec" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 30 }}>
      <h2 className="disp h2" style={{ margin: 0, fontWeight: 800 }}>Pay {p.now}.<br /><span style={{ color: '#1D4ED8' }}>{bonusValue ? `Get ${bonusValue} back.` : 'Get the template free.'}</span></h2>
      <div className="d-raised" style={{ borderRadius: 32, background: '#0E1013', color: '#F4F5F7', padding: '34px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 800, letterSpacing: '.06em', background: 'var(--cta)', color: '#0E1013', borderRadius: 6, padding: '4px 9px' }}>FOR EVERY BUYER</span>
        <div className="disp h2" style={{ fontWeight: 800 }}>Free landing page template</div>
        {bonusValue && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="disp price-xl" style={{ fontWeight: 800, lineHeight: 1, color: '#9DB8FF' }}>{bonusValue}</span>
            <span style={{ fontSize: 16, color: '#C9CDD4' }}>value, yours free</span>
          </div>
        )}
        <div style={{ fontSize: 17, color: '#E4E6EA', maxWidth: 560 }}>The page structure I use to sell, ready to use. Add your product and go live right after the session.</div>
        <div style={{ fontSize: 12, color: '#A9AEB8' }}>Download it instantly after payment, from your confirmation page and email.</div>
      </div>
      <div className="g2">
        <div className="raised" style={{ borderRadius: 24, padding: 24, background: '#F4F5F7', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="tag" style={{ alignSelf: 'flex-start', background: 'var(--cta)', color: '#0E1013' }}>WHAT YOU GET</span>
          {media?.bonus_template_cover && (
            <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '16 / 10' }}>
              <SiteImage media={media} k="bonus_template_cover" sizes="(min-width: 900px) 420px, 90vw" />
            </div>
          )}
          <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>A ready-made sales page</div>
          <div style={{ color: '#2F343C' }}>The same layout I use to sell my own product. Swap in your product, price and photos, then publish.</div>
        </div>
        <div className="raised" style={{ borderRadius: 24, padding: 24, background: '#F4F5F7', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="tag" style={{ alignSelf: 'flex-start', background: '#1D4ED8', color: '#FFFFFF' }}>HOW TO GET IT</span>
          <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>3 steps to your free template</div>
          <div style={{ color: '#2F343C' }}>
            <strong style={{ color: '#0E1013' }}>1.</strong> Book your seat for {p.now}<br />
            <strong style={{ color: '#0E1013' }}>2.</strong> Download it right after payment<br />
            <strong style={{ color: '#0E1013' }}>3.</strong> Add your product and go live
          </div>
        </div>
      </div>
    </div>
  );
}
