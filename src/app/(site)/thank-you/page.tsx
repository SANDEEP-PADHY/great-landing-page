import type { Metadata } from 'next';
import { getOrderReceipt } from '@/lib/orders';
import { getPublicSettings } from '@/lib/settings';
import { SITE } from '@/content/landing';
import { TrackingRoot } from '@/components/tracking/TrackingRoot';
import { PurchasePixel } from '@/components/tracking/PurchasePixel';
import { TrackedLink } from '@/components/site/TrackedLink';
import { PendingStatus, ThankYouView } from '@/components/site/ThankYouClient';
import { Footer } from '@/components/landing/Footer';
import { icsStamp, inr, longDateIST } from '@/components/landing/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thank you', robots: { index: false, follow: false } };

type SP = Promise<{ o?: string; t?: string }>;

function NotFound({ email }: { email: string }) {
  return (
    <>
      <TrackingRoot pageType="thank_you" />
      <div className="page-narrow">
        <div className="raised" style={{ borderRadius: 24, background: '#F4F5F7', padding: 28, textAlign: 'center' }}>
          <h1 className="disp" style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800 }}>Order not found</h1>
          <p style={{ margin: 0, color: '#2F343C' }}>
            This link is invalid or has expired. If you paid, check your email for the confirmation, or write to <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </div>
      </div>
      <Footer email={email} bottomPad={32} />
    </>
  );
}

export default async function ThankYouPage({ searchParams }: { searchParams: SP }) {
  const { o, t } = await searchParams;
  const settings = await getPublicSettings();
  const email = settings.contact_email || SITE.defaultContactEmail;
  const receipt = o && t ? await getOrderReceipt(o, t) : null;
  if (!o || !t || !receipt) return <NotFound email={email} />;

  const slotLabel = `${receipt.slot.dayLabel} ${receipt.slot.dateLabel}, 7 PM`;

  if (receipt.status !== 'paid') {
    return (
      <>
        <TrackingRoot pageType="thank_you" />
        <ThankYouView status={receipt.status} />
        <div className="page-narrow">
          {receipt.status === 'pending' ? (
            <PendingStatus publicId={receipt.publicId} token={t} />
          ) : (
            <div className="raised" style={{ borderRadius: 24, background: '#F4F5F7', padding: 28, textAlign: 'center' }}>
              <h1 className="disp" style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800 }}>Payment not completed</h1>
              <p style={{ margin: '0 0 16px', color: '#2F343C' }}>No money was taken for this order. You can try again from the booking page.</p>
              <a className="btn-cta cta" href={`/?slot=${receipt.slot.id}`}>Back to booking</a>
            </div>
          )}
        </div>
        <Footer email={email} bottomPad={32} />
      </>
    );
  }

  const calTitle = encodeURIComponent('GenZy Club Live Webinar');
  const calDetails = encodeURIComponent('Your webinar link comes on WhatsApp and email before the session.');
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${icsStamp(receipt.slot.startsAt)}/${icsStamp(receipt.slot.endsAt)}&details=${calDetails}`;
  const q = `o=${encodeURIComponent(receipt.publicId)}&t=${encodeURIComponent(t)}`;

  return (
    <>
      <TrackingRoot pageType="thank_you" />
      <ThankYouView status="paid" />
      <PurchasePixel orderId={receipt.orderId} valuePaise={receipt.amountPaise} slotId={receipt.slot.id} />
      <div className="page-narrow" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="raised" style={{ borderRadius: 28, background: '#F4F5F7', padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <span style={{ width: 56, height: 56, borderRadius: '50%', background: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
          </span>
          <h1 className="disp" style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>Seat confirmed for {slotLabel}</h1>
          <p style={{ margin: 0, color: '#2F343C' }}>Thanks {receipt.customer.name.split(' ')[0]}! The webinar link comes on WhatsApp and email before the session.</p>
        </div>

        {settings.whatsapp_link ? (
          <TrackedLink href={settings.whatsapp_link} event="whatsapp_join_click" target="_blank" className="btn-cta cta btn-wa" style={{ background: '#128C7E', color: '#fff' }}>
            Join WhatsApp Community
          </TrackedLink>
        ) : (
          <div className="inset" style={{ borderRadius: 14, padding: '16px', textAlign: 'center', fontWeight: 600 }}>Your WhatsApp community link is on its way to your email.</div>
        )}

        <div className="g2" style={{ gap: 12 }}>
          <TrackedLink href={gcal} event="calendar_add_click" props={{ type: 'google' }} target="_blank" className="btn-secondary raised-sm">Add to Google Calendar</TrackedLink>
          <TrackedLink href={`/api/calendar/${receipt.publicId}?t=${encodeURIComponent(t)}`} event="calendar_add_click" props={{ type: 'ics' }} className="btn-secondary raised-sm">Download .ics</TrackedLink>
        </div>
        <TrackedLink href={`/api/download/template?${q}`} event="template_download_click" className="btn-secondary raised-sm">Download the free landing page template</TrackedLink>

        <div className="raised-sm" style={{ borderRadius: 18, background: '#F4F5F7', padding: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, color: '#2F343C' }}>
          <div><strong style={{ color: '#0E1013' }}>Free landing page template:</strong> download it with the button above. The link is also in your confirmation email.</div>
          <div>Order ID: <strong style={{ color: '#0E1013' }}>{receipt.publicId}</strong> · {inr(receipt.amountPaise)} paid{receipt.paidAt ? ` on ${longDateIST(receipt.paidAt)}` : ''}</div>
          <TrackedLink href={`/invoice/${receipt.publicId}?t=${t}`} event="invoice_view_click">View invoice</TrackedLink>
        </div>
      </div>
      <Footer email={email} bottomPad={32} />
    </>
  );
}
