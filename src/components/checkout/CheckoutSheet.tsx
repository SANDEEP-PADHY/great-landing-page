'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError, CreateOrderRequest, CreateOrderResponse } from '@/lib/contracts';
import { setPixelUserData, track } from '@/lib/tracking/client';
import { useLanding } from '@/components/landing/LandingProvider';
import { inr } from '@/components/landing/format';
import { loadRazorpay, openRazorpay } from './useRazorpay';

type Field = 'name' | 'phone' | 'email';
type Errors = Partial<Record<Field, string>>;

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f: Field, v: string): string | null {
  if (f === 'name') return v.trim().length >= 2 ? null : 'Enter your full name';
  if (f === 'phone') return PHONE_RE.test(v) ? null : 'Enter a valid 10-digit mobile number';
  return EMAIL_RE.test(v.trim()) ? null : 'Enter a valid email address';
}

export function CheckoutSheet({ logoSrc }: { logoSrc?: string }) {
  const { sheetOpen, sheetLocation, closeSheet, slots, selectedId, selected, selectSlot, markSlotClosed, price, salesOpen } = useLanding();
  if (!sheetOpen) return null;
  return (
    <SheetBody
      key="sheet"
      location={sheetLocation}
      onClose={closeSheet}
      slots={slots}
      selectedId={selectedId}
      selectedLabel={selected ? `${selected.dayLabel} ${selected.dateLabel}` : ''}
      selectSlot={selectSlot}
      markSlotClosed={markSlotClosed}
      pricePaise={price.pricePaise}
      salesOpen={salesOpen}
      logoSrc={logoSrc}
    />
  );
}

function SheetBody({
  location, onClose, slots, selectedId, selectSlot, markSlotClosed, pricePaise, salesOpen, logoSrc,
}: {
  location: string;
  onClose: () => void;
  slots: ReturnType<typeof useLanding>['slots'];
  selectedId: string | null;
  selectedLabel: string;
  selectSlot: ReturnType<typeof useLanding>['selectSlot'];
  markSlotClosed: ReturnType<typeof useLanding>['markSlotClosed'];
  pricePaise: number;
  salesOpen: boolean;
  logoSrc?: string;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [closedAll, setClosedAll] = useState(!salesOpen);

  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const pushedRef = useRef(false);
  const orderRef = useRef<{ key: string; order: CreateOrderResponse } | null>(null);
  const completed = useRef<Set<Field>>(new Set());

  // ---- open: track, lock scroll, push history state, preload Razorpay, focus ----
  useEffect(() => {
    track('checkout_open', { location, slot_id: selectedId ?? undefined, value: pricePaise / 100, currency: 'INR' });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement as HTMLElement | null;
    try {
      history.pushState({ gzSheet: true }, '');
      pushedRef.current = true;
    } catch {
      /* ignore */
    }
    loadRazorpay().catch(() => undefined);
    nameRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(
    (viaPop = false) => {
      if (!submittedRef.current) track('checkout_close', { stage: 'form' });
      if (pushedRef.current) {
        pushedRef.current = false;
        if (!viaPop) {
          try { history.back(); } catch { /* ignore */ }
        }
      }
      onClose();
    },
    [onClose],
  );

  // Browser/mobile Back closes the sheet.
  useEffect(() => {
    const onPop = () => close(true);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [close]);

  // Esc closes; Tab is trapped inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!busy) close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const f = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]');
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, close]);

  const onBlur = (f: Field, v: string) => {
    const err = validate(f, v);
    setErrors((e) => ({ ...e, [f]: err ?? undefined }));
    if (!err && !completed.current.has(f)) {
      completed.current.add(f);
      track('form_field_complete', { field: f });
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBanner(null);

    const next: Errors = {};
    (['name', 'phone', 'email'] as Field[]).forEach((f) => {
      const v = f === 'name' ? name : f === 'phone' ? phone : email;
      const err = validate(f, v);
      if (err) {
        next[f] = err;
        track('form_error', { field: f, code: 'invalid' });
      }
    });
    setErrors(next);
    if (next.name || next.phone || next.email) {
      const first = (['name', 'phone', 'email'] as Field[]).find((f) => next[f]);
      dialogRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (!selectedId) { setBanner('Pick an open date first.'); return; }

    submittedRef.current = true;
    setBusy(true);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const key = [selectedId, cleanName, phone, cleanEmail].join('|');

    try {
      let order: CreateOrderResponse;
      if (orderRef.current && orderRef.current.key === key) {
        // Retry after dismiss/failure: reuse the same Razorpay order, no second Lead event.
        order = orderRef.current.order;
      } else {
        const leadEventId = crypto.randomUUID();
        track('lead_submit', { slot_id: selectedId, value: pricePaise / 100 }, { eventId: leadEventId });
        const body: CreateOrderRequest = {
          slotId: selectedId as CreateOrderRequest['slotId'],
          name: cleanName, phone, email: cleanEmail, leadEventId,
        };
        const res = await fetch('/api/checkout/order', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({ error: 'payment_provider' }))) as ApiError;
          handleApiError(err);
          return;
        }
        order = (await res.json()) as CreateOrderResponse;
        orderRef.current = { key, order };
        setPixelUserData({ email: cleanEmail, phone: '91' + phone, name: cleanName });
      }

      const outcome = await openRazorpay(
        order,
        { slotId: selectedId, valuePaise: order.amount, logoSrc },
        () => setBanner('Payment failed. You can try again in the payment window, or close it and retry.'),
      );
      if (outcome.type === 'success') {
        window.location.assign(outcome.redirect); // button stays disabled until the page changes
        return;
      }
      if (outcome.type === 'verify_error') {
        setBanner('We received your payment but could not confirm it yet. Check your email in a few minutes. Do not pay again. Contact us if you hear nothing.');
        return;
      }
      if (outcome.type === 'dismissed') setBanner('Payment was not completed. Tap the button to try again.');
      setBusy(false);
    } catch {
      setBanner('Something went wrong, try again.');
      setBusy(false);
    }
  }

  function handleApiError(err: ApiError) {
    submittedRef.current = false;
    setBusy(false);
    switch (err.error) {
      case 'slot_closed':
        if (selectedId) markSlotClosed(selectedId as Parameters<typeof markSlotClosed>[0]);
        setBanner('That date has just closed. Please pick another date.');
        break;
      case 'sales_closed':
        setClosedAll(true);
        break;
      case 'validation': {
        const next: Errors = {};
        (['name', 'phone', 'email'] as Field[]).forEach((f) => {
          const msg = err.fields?.[f];
          if (msg) { next[f] = msg; track('form_error', { field: f, code: 'server' }); }
        });
        setErrors(next);
        if (!Object.keys(next).length) setBanner('Please check your details and try again.');
        break;
      }
      case 'rate_limited':
        setBanner('Too many attempts. Please wait a few minutes and try again.');
        break;
      default:
        setBanner('Something went wrong, try again.');
    }
  }

  const bad = (f: Field) => (errors[f] ? { 'aria-invalid': true, 'aria-describedby': `err-${f}` } : {});

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) close(); }}>
      <div ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-label="Book your seat">
        <div style={{ width: 44, height: 5, borderRadius: 3, background: '#B9BDC5', margin: '0 auto' }} aria-hidden="true" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Book your seat</div>
          <button type="button" className="raised-sm" onClick={() => !busy && close()} aria-label="Close"
            style={{ width: 44, height: 44, borderRadius: '50%', border: 0, background: '#F4F5F7', color: '#0E1013', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {closedAll ? (
          <div className="inset" style={{ borderRadius: 14, padding: '18px 16px', fontSize: 15, textAlign: 'center' }}>
            <strong>Bookings closed.</strong><br />Registrations for this webinar are closed right now.
          </div>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {banner && (
              <div role="alert" className="inset" style={{ borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#0E1013' }}>
                <strong style={{ color: '#B42318' }}>{banner}</strong>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} role="group" aria-label="Choose a date">
              <div style={{ fontSize: 14, fontWeight: 600 }}>Date · 7–9 PM IST</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                {slots.map((s) => {
                  const sel = s.id === selectedId;
                  return (
                    <button key={s.id} type="button" disabled={!s.open || busy} aria-pressed={sel}
                      className={`chip ${sel ? 'inset' : 'raised-sm'}`}
                      onClick={() => selectSlot(s.id, 'sheet')}
                      style={{ border: `2px solid ${sel ? '#1D4ED8' : 'transparent'}` }}>
                      <span style={{ display: 'block', fontSize: 11, color: '#2F343C' }}>{s.dayLabel}</span>
                      <span style={{ display: 'block', fontWeight: 800 }}>{s.dateLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="field">Full name
              <input ref={nameRef} name="name" className={`inset field-input ${errors.name ? 'field-bad' : ''}`} type="text" autoComplete="name" placeholder="Your name"
                value={name} maxLength={80} disabled={busy}
                onChange={(e) => setName(e.target.value)} onBlur={(e) => onBlur('name', e.target.value)} {...bad('name')} />
              {errors.name && <span id="err-name" className="field-err">{errors.name}</span>}
            </label>

            <label className="field">WhatsApp number
              <span className={`inset ${errors.phone ? 'field-bad' : ''}`} style={{ display: 'flex', height: 52, borderRadius: 14, overflow: 'hidden' }}>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', color: '#2F343C', fontWeight: 600, borderRight: '1px solid #C9CDD4' }}>+91</span>
                <input name="phone" type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="10-digit number"
                  value={phone} disabled={busy}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={(e) => onBlur('phone', e.target.value)}
                  style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: '#0E1013', padding: '0 14px', fontSize: 16, fontFamily: 'inherit' }} {...bad('phone')} />
              </span>
              {errors.phone && <span id="err-phone" className="field-err">{errors.phone}</span>}
            </label>

            <label className="field">Email
              <input name="email" className={`inset field-input ${errors.email ? 'field-bad' : ''}`} type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
                value={email} maxLength={120} disabled={busy}
                onChange={(e) => setEmail(e.target.value)} onBlur={(e) => onBlur('email', e.target.value)} {...bad('email')} />
              {errors.email && <span id="err-email" className="field-err">{errors.email}</span>}
            </label>

            <button type="submit" className="btn-cta cta raised" disabled={busy || !selectedId} style={{ height: 58 }}>
              {busy ? (
                <><span className="spinner" aria-hidden="true" />Opening secure payment…</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  Pay {inr(pricePaise)} securely
                </>
              )}
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#2F343C' }}>
              UPI, cards or netbanking via Razorpay. {inr(pricePaise)} is the final amount. No refunds.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
