import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { CopyButton } from '@/components/admin/CopyButton';
import { Badge, Card, Field, PageHeader, StatusBadge, TableBox, btn, input, td, th } from '@/components/admin/ui';
import { getVisitorJourney } from '@/lib/analytics/queries';
import { getOrderDetail } from '@/lib/admin/data';
import { fmtDateTime } from '@/lib/admin/time';
import { waLink } from '@/lib/admin/whatsapp';
import { SLOT_IDS } from '@/lib/contracts';
import { formatINR } from '@/lib/pricing';
import { getSlots } from '@/lib/slots';
import { changeSlotAction, resendConfirmationAction, saveNoteAction, toggleFlagAction } from './actions';

export const metadata: Metadata = { title: 'Buyer' };
export const dynamic = 'force-dynamic';

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-line/60 py-1.5 text-sm last:border-0"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words text-right font-medium">{children}</dd></div>;
}

export default async function BuyerDetail({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const d = await getOrderDetail(orderId);
  if (!d) notFound();
  const { order: o, customer: c, slot, visitor, emails, otherOrders } = d;
  const [slots, journey] = await Promise.all([getSlots(), o.visitorId ? getVisitorJourney(o.visitorId) : Promise.resolve([])]);
  const first = (visitor?.firstTouch ?? {}) as Record<string, unknown>;
  const touch = (t: Record<string, unknown>) => Object.entries(t).filter(([, v]) => v).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') || '—';

  return (
    <>
      <PageHeader title={c.name} subtitle={`Order ${o.publicId}`} actions={<Link className={btn} href="/admin/buyers">← All buyers</Link>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Customer" className="lg:col-span-1">
          <dl>
            <Row k="Phone"><span className="mr-2">{c.phone}</span><CopyButton text={c.phone} /></Row>
            <Row k="Email"><span className="mr-2">{c.email}</span><CopyButton text={c.email} /></Row>
            <Row k="Customer since">{fmtDateTime(c.createdAt, true)}</Row>
          </dl>
          <a className={`${btn} mt-3 w-full`} href={waLink(c.phone)} target="_blank" rel="noreferrer">Open in WhatsApp</a>
          {otherOrders.length > 0 && (
            <div className="mt-4 text-sm"><div className="mb-1 font-semibold">Other orders</div>
              {otherOrders.map((x) => <div key={x.id} className="flex justify-between py-0.5"><Link className="text-brand hover:underline" href={`/admin/buyers/${x.id}`}>{x.publicId}</Link><StatusBadge status={x.status} /></div>)}
            </div>
          )}
        </Card>

        <Card title="Order & payment" className="lg:col-span-1">
          <dl>
            <Row k="Status"><StatusBadge status={o.status} /></Row>
            <Row k="Amount">{formatINR(o.amountPaise)}</Row>
            <Row k="Slot">{slot.dayLabel} {slot.dateLabel}</Row>
            <Row k="Method">{o.paymentMethod ?? '—'}</Row>
            <Row k="Razorpay order"><span className="font-mono text-xs">{o.razorpayOrderId}</span></Row>
            <Row k="Payment ID"><span className="font-mono text-xs">{o.razorpayPaymentId ?? '—'}</span></Row>
            {o.lastFailureReason && <Row k="Last failure">{o.lastFailureReason}</Row>}
            <Row k="Created">{fmtDateTime(o.createdAt, true)}</Row>
            <Row k="Paid">{fmtDateTime(o.paidAt, true)}</Row>
            <Row k="Confirmation email">{o.confirmationSentAt ? fmtDateTime(o.confirmationSentAt) : '—'}</Row>
          </dl>
        </Card>

        <Card title="Attribution" className="lg:col-span-1">
          <dl>
            <Row k="First touch">{touch(first)}</Row>
            <Row k="Order source">{o.utmSource || '(direct)'}</Row>
            <Row k="Campaign">{o.utmCampaign || '—'}</Row>
            <Row k="Ad (content)">{o.utmContent || '—'}</Row>
            <Row k="Landing URL"><span className="text-xs">{o.landingUrl ?? '—'}</span></Row>
            <Row k="Referrer"><span className="text-xs">{o.referrer ?? '—'}</span></Row>
            <Row k="Device">{[visitor?.device, visitor?.os, visitor?.browser].filter(Boolean).join(' · ') || '—'}</Row>
            <Row k="Country">{visitor?.country ?? '—'}</Row>
          </dl>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Actions">
          <div className="space-y-4">
            <ActionForm action={changeSlotAction.bind(null, o.id)} className="flex flex-wrap items-end gap-2">
              <Field label="Change slot">
                <select name="slotId" defaultValue={o.slotId} className={input}>
                  {SLOT_IDS.map((id) => { const s = slots.find((x) => x.id === id); return <option key={id} value={id}>{s ? `${s.dayLabel} ${s.dateLabel}` : id}</option>; })}
                </select>
              </Field>
              <SubmitButton variant="plain">Move</SubmitButton>
            </ActionForm>
            <div className="flex flex-wrap gap-2">
              <ActionForm action={toggleFlagAction.bind(null, o.id, 'watchedFull', !o.watchedFull)}><SubmitButton variant="plain" pendingLabel="…">{o.watchedFull ? 'Unmark watched full' : 'Mark watched full'}</SubmitButton></ActionForm>
              <ActionForm action={toggleFlagAction.bind(null, o.id, 'bonusGiven', !o.bonusGiven)}><SubmitButton variant="plain" pendingLabel="…">{o.bonusGiven ? 'Unmark bonus given' : 'Mark bonus given'}</SubmitButton></ActionForm>
              {o.status === 'paid' && <ActionForm action={resendConfirmationAction.bind(null, o.id)}><SubmitButton variant="plain" pendingLabel="Sending…">Resend confirmation</SubmitButton></ActionForm>}
            </div>
          </div>
        </Card>
        <Card title="Admin note">
          <ActionForm action={saveNoteAction.bind(null, o.id)} className="space-y-2">
            <textarea name="note" rows={4} maxLength={2000} defaultValue={o.adminNote ?? ''} className={input} placeholder="Private note about this buyer" />
            <SubmitButton>Save note</SubmitButton>
          </ActionForm>
        </Card>
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold">Journey timeline ({journey.length} events)</h2>
      {journey.length === 0 ? <p className="text-sm text-muted">No tracked events for this visitor.</p> : (
        <TableBox>
          <table className="w-full">
            <thead><tr>{['Time', 'Event', 'Page', 'Details'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {journey.map((raw, i) => {
                const e = raw as unknown as Record<string, unknown>;
                const props = (e.props ?? null) as Record<string, unknown> | null;
                return (
                  <tr key={String(e.id ?? i)}>
                    <td className={td}>{fmtDateTime(String(e.occurredAt ?? e.at ?? ''))}</td>
                    <td className={td}><Badge tone="brand">{String(e.name ?? '')}</Badge></td>
                    <td className={td}>{String(e.path ?? '')}</td>
                    <td className="max-w-md truncate border-b border-line/70 px-3 py-2.5 font-mono text-xs text-muted">{props ? JSON.stringify(props) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold">Emails sent</h2>
      {emails.length === 0 ? <p className="text-sm text-muted">No emails for this order.</p> : (
        <TableBox>
          <table className="w-full">
            <thead><tr>{['When', 'Template', 'To', 'Status', 'Error'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{emails.map((m) => <tr key={m.id}><td className={td}>{fmtDateTime(m.createdAt)}</td><td className={td}>{m.template}</td><td className={td}>{m.to}</td><td className={td}><StatusBadge status={m.status} /></td><td className={`${td} text-red-700`}>{m.error ?? ''}</td></tr>)}</tbody>
          </table>
        </TableBox>
      )}
    </>
  );
}
