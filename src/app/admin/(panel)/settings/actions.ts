'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/admin/action-state';
import { logAudit } from '@/lib/admin/audit';
import { fromIstInput } from '@/lib/admin/time';
import { requireAdmin } from '@/lib/auth/session';
import type { Settings } from '@/lib/contracts';
import { getSettingsFresh, updateSettings } from '@/lib/settings';

const rupees = z.coerce.number().int().min(1, 'Must be at least ₹1').max(1_000_000);
const Schema = z.object({
  whatsapp_link: z.string().trim().max(200).refine((v) => v === '' || v.startsWith('https://chat.whatsapp.com/'), 'Must start with https://chat.whatsapp.com/'),
  contact_email: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
  contact_phone: z.string().trim().max(20).refine((v) => v === '' || /^\+?[0-9 ]{10,15}$/.test(v), 'Enter a valid phone number'),
  offer_price_rupees: rupees,
  regular_price_rupees: rupees,
  offer_ends_at: z.string().refine((v) => fromIstInput(v) !== null, 'Pick a valid date and time'),
  sales_open: z.boolean(),
  bonus_value: z.string().trim().max(40),
  email_abandoned_enabled: z.boolean(),
  email_abandoned_delay_min: z.coerce.number().int().min(5, 'At least 5 minutes').max(1440),
  email_admin_alert_enabled: z.boolean(),
  email_auto_reminder_enabled: z.boolean(),
});

export async function saveSettingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const bool = (k: string) => fd.get(k) === 'on';
  const parsed = Schema.safeParse({
    whatsapp_link: fd.get('whatsapp_link') ?? '', contact_email: fd.get('contact_email') ?? '', contact_phone: fd.get('contact_phone') ?? '',
    offer_price_rupees: fd.get('offer_price_rupees'), regular_price_rupees: fd.get('regular_price_rupees'), offer_ends_at: fd.get('offer_ends_at') ?? '',
    sales_open: bool('sales_open'), bonus_value: fd.get('bonus_value') ?? '',
    email_abandoned_enabled: bool('email_abandoned_enabled'), email_abandoned_delay_min: fd.get('email_abandoned_delay_min'),
    email_admin_alert_enabled: bool('email_admin_alert_enabled'), email_auto_reminder_enabled: bool('email_auto_reminder_enabled'),
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] = i.message;
    return { error: `Fix: ${Object.values(fields).join(' · ')}`, fields };
  }
  const v = parsed.data;
  if (v.offer_price_rupees > v.regular_price_rupees) return { error: 'Offer price cannot be higher than the regular price.' };

  const next: Partial<Settings> = {
    whatsapp_link: v.whatsapp_link, contact_email: v.contact_email, contact_phone: v.contact_phone,
    offer_price_paise: v.offer_price_rupees * 100, regular_price_paise: v.regular_price_rupees * 100,
    offer_ends_at: fromIstInput(v.offer_ends_at)!, sales_open: v.sales_open, bonus_value: v.bonus_value,
    email_abandoned_enabled: v.email_abandoned_enabled, email_abandoned_delay_min: v.email_abandoned_delay_min,
    email_admin_alert_enabled: v.email_admin_alert_enabled, email_auto_reminder_enabled: v.email_auto_reminder_enabled,
  };
  const cur = await getSettingsFresh();
  const changed = Object.fromEntries(Object.entries(next).filter(([k, val]) => JSON.stringify(cur[k as keyof Settings]) !== JSON.stringify(val)).map(([k, val]) => [k, { from: cur[k as keyof Settings], to: val }]));
  if (Object.keys(changed).length === 0) return { ok: true, message: 'Nothing changed.' };
  await updateSettings(next);
  await logAudit('settings.update', null, changed);
  revalidatePath('/admin/settings');
  return { ok: true, message: 'Saved. The site and emails use the new values now.' };
}
