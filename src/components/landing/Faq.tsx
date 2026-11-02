'use client';

import { useId, useState } from 'react';
import { FAQS } from '@/content/landing';
import { track } from '@/lib/tracking/client';

export function Faq() {
  const [open, setOpen] = useState(0);
  const base = useId();
  return (
    <div data-section="faq" className="wrap sec" style={{ paddingTop: 0, maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 className="disp h2" style={{ margin: 0, fontWeight: 800 }}>FAQ</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FAQS.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div key={q} className={isOpen ? 'inset' : 'raised-sm'} style={{ borderRadius: 18, background: '#F4F5F7' }}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${base}-${i}`}
                onClick={() => {
                  if (!isOpen) track('faq_open', { index: i, question: q });
                  setOpen(isOpen ? -1 : i);
                }}
                style={{ width: '100%', background: 'transparent', border: 0, color: '#0E1013', textAlign: 'left', padding: '18px 20px', fontSize: 16, fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', minHeight: 58 }}
              >
                <span>{q}</span>
                <svg style={{ flex: 'none', transition: 'transform .2s ease', transform: `rotate(${isOpen ? 180 : 0}deg)` }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {isOpen && <div id={`${base}-${i}`} style={{ padding: '0 20px 18px', color: '#2F343C', fontSize: 15 }}>{a}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
