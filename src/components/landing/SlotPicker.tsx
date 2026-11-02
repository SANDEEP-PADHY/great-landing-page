'use client';

import { useLanding } from './LandingProvider';

/** The 4 date cards in the pricing block. Closed slots are greyed out and disabled. */
export function SlotPicker() {
  const { slots, selectedId, selectSlot } = useLanding();
  return (
    <div className="slots">
      {slots.map((s) => {
        const selected = s.id === selectedId;
        const note = !s.open ? 'Closed' : selected ? 'Selected' : 'Open';
        return (
          <button
            key={s.id}
            type="button"
            className={`slot-card ${selected ? 'inset' : 'raised-sm'}`}
            disabled={!s.open}
            aria-pressed={selected}
            onClick={() => selectSlot(s.id, 'pricing')}
            style={{
              border: `2px solid ${selected ? '#1D4ED8' : 'transparent'}`, background: '#F4F5F7', color: '#0E1013',
              borderRadius: 16, padding: 14, minHeight: 84, textAlign: 'left',
            }}
          >
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2F343C' }}>{s.dayLabel}</span>
            <span className="disp" style={{ display: 'block', fontSize: 20, fontWeight: 800 }}>{s.dateLabel}</span>
            <span style={{ display: 'block', fontSize: 12, marginTop: 2, fontWeight: 600, color: selected ? '#1D4ED8' : '#2F343C' }}>{note}</span>
          </button>
        );
      })}
    </div>
  );
}
