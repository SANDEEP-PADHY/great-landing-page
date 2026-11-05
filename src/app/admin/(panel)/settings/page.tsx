import type { Metadata } from 'next';
import { ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { Card, Field, PageHeader, input } from '@/components/admin/ui';
import { toIstInput } from '@/lib/admin/time';
import { formatINR } from '@/lib/pricing';
import { getSettingsFresh } from '@/lib/settings';
import { saveSettingsAction } from './actions';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

function Check({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-brand" />
      <span><span className="font-medium">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
    </label>
  );
}

export default async function SettingsPage() {
  const s = await getSettingsFresh();
  return (
    <>
      <PageHeader title="Settings" subtitle="Everything here updates the live site and emails immediately." />
      <ActionForm action={saveSettingsAction} className="max-w-3xl space-y-4">
        <Card title="WhatsApp community">
          <Field label="WhatsApp group link" hint="Shown on the thank-you page and in every confirmation email. Leave empty until the group exists.">
            <input name="whatsapp_link" defaultValue={s.whatsapp_link} placeholder="https://chat.whatsapp.com/…" className={input} />
          </Field>
        </Card>
        <Card title="Contact details">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Support email"><input name="contact_email" type="email" defaultValue={s.contact_email} required className={input} /></Field>
            <Field label="Support phone"><input name="contact_phone" defaultValue={s.contact_phone} placeholder="+91 98765 43210" className={input} /></Field>
          </div>
        </Card>
        <Card title="Pricing & sales">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Offer price (₹)" hint={`Buyers now pay ${formatINR(s.offer_price_paise)}`}><input name="offer_price_rupees" type="number" min={1} defaultValue={s.offer_price_paise / 100} required className={input} /></Field>
            <Field label="Regular price (₹)"><input name="regular_price_rupees" type="number" min={1} defaultValue={s.regular_price_paise / 100} required className={input} /></Field>
            <Field label="Offer ends (IST)"><input name="offer_ends_at" type="datetime-local" defaultValue={toIstInput(s.offer_ends_at)} required className={input} /></Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Template bonus value (optional)" hint="For example ₹999. Leave empty to hide the “worth” text."><input name="bonus_value" defaultValue={s.bonus_value} className={input} /></Field>
          </div>
          <div className="mt-4"><Check name="sales_open" label="Sales open" defaultChecked={s.sales_open} hint="Turn off to show “Bookings closed” and block new checkouts." /></div>
        </Card>
        <Card title="Emails">
          <div className="space-y-3">
            <Check name="email_abandoned_enabled" label="Send abandoned-checkout email" defaultChecked={s.email_abandoned_enabled} />
            <Field label="Abandoned email delay (minutes)"><input name="email_abandoned_delay_min" type="number" min={5} max={1440} defaultValue={s.email_abandoned_delay_min} className={`${input} max-w-[10rem]`} /></Field>
            <Check name="email_admin_alert_enabled" label="Email me on every sale" defaultChecked={s.email_admin_alert_enabled} />
            <Check name="email_auto_reminder_enabled" label="Auto-send slot reminder 60 min before start" defaultChecked={s.email_auto_reminder_enabled} hint="Only sends when the slot has a webinar link." />
          </div>
        </Card>
        <SubmitButton>Save settings</SubmitButton>
      </ActionForm>
    </>
  );
}
