// Client-safe formatting helpers (no server imports, so they can ship in client bundles).

export function inr(paise: number): string {
  const rupees = paise / 100;
  return '₹' + rupees.toLocaleString('en-IN', { maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2 });
}

const pad = (n: number) => String(n).padStart(2, '0');

export function splitMs(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return {
    d: pad(Math.floor(t / 86400)),
    h: pad(Math.floor((t % 86400) / 3600)),
    m: pad(Math.floor((t % 3600) / 60)),
    s: pad(t % 60),
  };
}

/** '10 Nov' in IST */
export function shortDateIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
}

/** 'Sat, 7 Nov 2026' in IST */
export function longDateIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export function dateTimeIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }).format(new Date(iso)) + ' IST';
}

export function savePct(pricePaise: number, regularPaise: number): number {
  if (regularPaise <= 0) return 0;
  return Math.round((1 - pricePaise / regularPaise) * 100);
}

/** 20261107T133000Z */
export function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export type PriceCopy = { now: string; regular: string; save: number; till: string; isOffer: boolean };

export function priceCopy(p: { pricePaise: number; regularPaise: number; offerEndsAt: string; isOffer: boolean }): PriceCopy {
  return {
    now: inr(p.pricePaise),
    regular: inr(p.regularPaise),
    save: savePct(p.pricePaise, p.regularPaise),
    till: shortDateIST(p.offerEndsAt),
    isOffer: p.isOffer,
  };
}
