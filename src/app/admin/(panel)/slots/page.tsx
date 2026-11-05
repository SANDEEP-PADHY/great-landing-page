import type { Metadata } from 'next';
import { ActionForm, ConfirmForm, SubmitButton } from '@/components/admin/ActionForm';
import { Badge, Card, PageHeader, btn, input } from '@/components/admin/ui';
import { slotStats } from '@/lib/admin/data';
import { fmtDateTime } from '@/lib/admin/time';
import type { SlotId } from '@/lib/contracts';
import { formatINR } from '@/lib/pricing';
import { createSlotAction, deleteSlotAction, restoreSlotAction, saveCapacityAction, saveWebinarUrlAction, sendReminderAction, toggleSlotAction } from './actions';

export const metadata: Metadata = { title: 'Slots' };
export const dynamic = 'force-dynamic';

export default async function SlotsPage() {
  const all = await slotStats();
  const slots = all.filter((s) => !s.archivedAt);
  const archived = all.filter((s) => s.archivedAt);
  return (
    <>
      <PageHeader title="Slots" subtitle="Webinar batches. A slot also closes by itself when it starts." />
      <Card title="Add a slot">
        <ActionForm action={createSlotAction} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Date (IST)<input name="date" type="date" required className={`${input} mt-1 block`} /></label>
          <label className="text-sm">Starts<input name="start" type="time" required defaultValue="19:00" className={`${input} mt-1 block`} /></label>
          <label className="text-sm">Ends<input name="end" type="time" required defaultValue="21:00" className={`${input} mt-1 block`} /></label>
          <label className="text-sm">Seats (optional)<input name="capacity" type="number" min={1} placeholder="Unlimited" className={`${input} mt-1 block w-28`} /></label>
          <label className="text-sm">Webinar link (optional)<input name="webinarUrl" type="url" placeholder="https://…" className={`${input} mt-1 block`} /></label>
          <SubmitButton pendingLabel="Adding…">Add slot</SubmitButton>
        </ActionForm>
        <p className="mt-2 text-xs text-muted">Times are IST. The new slot shows on the landing page and checkout straight away.</p>
      </Card>
      {slots.length === 0 && <p className="my-4 text-sm text-amber-700">No open slots. Visitors see no dates until you add one.</p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                {s.capacity != null && <div><div className="text-2xl font-bold tabular-nums">{s.buyers}/{s.capacity}</div><div className="text-muted">seats{s.buyers >= s.capacity ? ' (full)' : ''}</div></div>}
              </div>
              <div className="mt-4 space-y-3">
                <ActionForm action={toggleSlotAction.bind(null, id, !s.isOpen)}>
                  <SubmitButton variant="plain" pendingLabel="…">{s.isOpen ? 'Close bookings' : 'Re-open bookings'}</SubmitButton>
                </ActionForm>
                <ActionForm action={saveCapacityAction.bind(null, id)} className="flex gap-2">
                  <input name="capacity" type="number" min={1} defaultValue={s.capacity ?? ''} placeholder="Unlimited seats" className={input} aria-label="Seat limit" />
                  <SubmitButton>Save seats</SubmitButton>
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
                <ConfirmForm action={deleteSlotAction.bind(null, id)} label="Delete slot" confirmLabel={s.orderCount ? 'Archive slot' : 'Delete for good'}>
                  {s.orderCount > 0 ? (
                    <div className="max-w-xs text-xs">
                      <p>This slot has {s.orderCount} order{s.orderCount === 1 ? '' : 's'} ({s.buyers} paid), so it is archived instead of erased: hidden from the site and checkout, while buyers keep their booking, reminders and invoices.</p>
                      {s.buyers > 0 && <label className="mt-1 flex items-center gap-1.5 font-semibold"><input type="checkbox" name="confirmPaid" /> I understand {s.buyers} paid buyer{s.buyers === 1 ? '' : 's'} are booked here</label>}
                    </div>
                  ) : <span className="text-xs">No orders yet. This removes the slot permanently.</span>}
                </ConfirmForm>
                {!s.webinarUrl && <p className="text-xs text-amber-700">Add the webinar link before sending reminders.</p>}
              </div>
            </Card>
          );
        })}
      </div>
    {archived.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold">Archived slots ({archived.length})</summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {archived.map((s) => (
              <Card key={s.id} title={`${s.dayLabel} ${s.dateLabel}`} right={<Badge tone="bad">Archived</Badge>}>
                <p className="text-sm text-muted">{fmtDateTime(s.startsAt, true)} · {s.buyers} paid buyers</p>
                <div className="mt-3 flex flex-wrap items-start gap-2">
                  <ActionForm action={restoreSlotAction.bind(null, s.id as SlotId)}><SubmitButton variant="plain" pendingLabel="…">Restore to site</SubmitButton></ActionForm>
                  <a className={btn} href={`/api/admin/export/buyers?slot=${s.id}&status=paid`}>Export CSV</a>
                </div>
              </Card>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
