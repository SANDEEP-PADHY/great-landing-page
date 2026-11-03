import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { db } from './db/client';
import { siteSettings } from './db/schema';
import type { PublicSettings, SettingKey, Settings } from './contracts';

export const DEFAULT_SETTINGS: Settings = {
  whatsapp_link: '',
  contact_email: 'genzyclub.com@gmail.com',
  contact_phone: '',
  offer_price_paise: 49900,
  regular_price_paise: 249900,
  offer_ends_at: '2026-11-10T23:59:59+05:30',
  sales_open: true,
  claude_bonus_value: '₹2,000',
  email_abandoned_enabled: true,
  email_abandoned_delay_min: 45,
  email_admin_alert_enabled: true,
  email_auto_reminder_enabled: false,
  capi_test_event_code: '',
};

/** Uncached read: use in the worker and in places that need fresh values. */
export async function getSettingsFresh(): Promise<Settings> {
  const rows = await db.select().from(siteSettings);
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) out[r.key] = r.value;
  return out as Settings;
}

const cached = unstable_cache(getSettingsFresh, ['site-settings'], { tags: ['site'], revalidate: 300 });

export async function getSettings(): Promise<Settings> {
  try {
    return await cached();
  } catch {
    // outside a Next request (scripts) there is no incremental cache
    return getSettingsFresh();
  }
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await getSettings();
  return {
    whatsapp_link: s.whatsapp_link, contact_email: s.contact_email, contact_phone: s.contact_phone,
    offer_price_paise: s.offer_price_paise, regular_price_paise: s.regular_price_paise,
    offer_ends_at: s.offer_ends_at, sales_open: s.sales_open, claude_bonus_value: s.claude_bonus_value,
  };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const entries = Object.entries(patch).filter(([k, v]) => k in DEFAULT_SETTINGS && v !== undefined) as [SettingKey, unknown][];
  for (const [key, value] of entries) {
    await db
      .insert(siteSettings)
      .values({ key, value: value as never })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: value as never, updatedAt: new Date() } });
  }
  try { revalidateTag('site'); } catch { /* not in a Next context */ }
}
