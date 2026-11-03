import type { Metadata } from 'next';
import { ActionForm, ConfirmForm, SubmitButton } from '@/components/admin/ActionForm';
import { Badge, Card, PageHeader, btn, input } from '@/components/admin/ui';
import { slotStats } from '@/lib/admin/data';
import { fmtDateTime } from '@/lib/admin/time';
import { SLOT_IDS, type SlotId } from '@/lib/contracts';
import { formatINR } from '@/lib/pricing';
import { saveWebinarUrlAction, sendReminderAction, toggleSlotAction } from './actions';

export const metadata: Metadata = { title: 'Slots' };
export const dynamic = 'force-dynamic';

export default async function SlotsPage() {
  const slots = (await slotStats()).filter((s) => (SLOT_IDS as readonly string[]).includes(s.id));
  return (
    <>
      <PageHeader title="Slots" subtitle="Webinar batches. A slot also closes by itself when it starts." />
      <div className="grid gap-4 lg:grid-cols-2">
        {slots.map((s) => {
          const id = s.id as SlotId;
          const started = s.startsAt.getTime() <= Date.now();
          const bookable = s.isOpen && !started;
          return (
            <Card key={s.id} title={`${s.dayLabel} ${s.dateLabel}`} right={bookable ? <Badge tone="good">Open</Badge> : <Badge tone="bad">{started ? 'Started' : 'Closed'}</Badge>}>
              <p className="text-sm text-muted">{fmtDateTime(s.startsAt, true)} → {fmtDateTime(s.endsAt)}</p>
              <div className="mt-3 flex gap-6 text-sm">
                <div><div className="text-2xl font-bold tabular-nums">{s.buyers}</div><div className="text-muted">buyers</div></div>
                <div><div className="text-2xl font-bold tabular-nums">{formatINR(s.revenuePaise)}</div><div className="text-muted">revenue</div></div>
              </div>
              <div className="mt-4 space-y-3">
                <ActionForm action={toggleSlotAction.bind(null, id, !s.isOpen)}>
                  <SubmitButton variant="plain" pendingLabel="…">{s.isOpen ? 'Close bookings' : 'Re-open bookings'}</SubmitButton>
                </ActionForm>
                <ActionForm action={saveWebinarUrlAction.bind(null, id)} className="flex gap-2">
                  <input name="webinarUrl" type="url" defaultValue={s.webinarUrl ?? ''} placeholder="https://webinar.gg/…" className={input} aria-label="Webinar link" />
                  <SubmitButton>Save</SubmitButton>
                </ActionForm>
                <div className="flex flex-wrap items-start gap-2">
                  <ConfirmForm action={sendReminderAction.bind(null, id)} label="Send reminder email" confirmLabel={`Send to ${s.buyers} buyers`}>
                    <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="resend" /> Also re-send to those already reminded</label>
                  </ConfirmForm>
                  <a className={btn} href={`/api/admin/export/buyers?slot=${s.id}&status=paid`}>Export CSV</a>
                </div>
                {!s.webinarUrl && <p className="text-xs text-amber-700">Add the webinar link before sending reminders.</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
