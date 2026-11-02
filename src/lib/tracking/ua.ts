export const BOT_RE = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|lighthouse|headless|slurp|monitor|curl|wget|python-requests/i;

export type UaInfo = { device: 'mobile' | 'tablet' | 'desktop'; os: string; browser: string; isBot: boolean };

export function parseUa(ua: string | null | undefined): UaInfo {
  const s = ua ?? '';
  const isBot = !s || BOT_RE.test(s);
  const device = /iPad|Tablet|PlayBook|Silk/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))
    ? 'tablet' : /Mobi|iPhone|iPod|Android/i.test(s) ? 'mobile' : 'desktop';
  const os = /Windows/i.test(s) ? 'Windows' : /Android/i.test(s) ? 'Android' : /iPhone|iPad|iPod/i.test(s) ? 'iOS'
    : /Mac OS X|Macintosh/i.test(s) ? 'macOS' : /Linux/i.test(s) ? 'Linux' : 'Other';
  const inApp = /FBAN|FBAV|FB_IAB/i.test(s) ? 'Facebook app' : /Instagram/i.test(s) ? 'Instagram app' : null;
  const browser = inApp ?? (/Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung'
    : /Chrome|CriOS/.test(s) ? 'Chrome' : /Firefox|FxiOS/.test(s) ? 'Firefox' : /Safari/.test(s) ? 'Safari' : 'Other');
  return { device, os, browser, isBot };
}
