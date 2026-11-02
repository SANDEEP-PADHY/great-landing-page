export const COOKIE = { vid: 'gz_vid', sid: 'gz_sid', attr: 'gz_attr', fbc: '_fbc', fbp: '_fbp' } as const;

export type Attribution = {
  utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string;
  fbclid?: string; referrer?: string; landing_url?: string; ts?: number;
};

export function parseAttr(raw: string | undefined | null): Attribution {
  if (!raw) return {};
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    return v && typeof v === 'object' ? (v as Attribution) : {};
  } catch {
    try { return JSON.parse(raw) as Attribution; } catch { return {}; }
  }
}
