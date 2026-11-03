import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrderReceipt } from '@/lib/orders';
import { getPublicSettings } from '@/lib/settings';
import { SITE } from '@/content/landing';
import { PrintButton } from '@/components/site/ThankYouClient';
import { dateTimeIST, inr, longDateIST } from '@/components/landing/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invoice', robots: { index: false, follow: false } };

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ publicId: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ publicId }, { t }] = await Promise.all([params, searchParams]);
  const r = t ? await getOrderReceipt(publicId, t) : null;
  if (!r) notFound();
  const s = await getPublicSettings();
  const email = s.contact_email || SITE.defaultContactEmail;
  const paid = r.status === 'paid';

  const rows: [string, string][] = [
    ['Invoice / Order ID', r.publicId],
    ['Date', longDateIST(r.paidAt ?? r.createdAt)],
    ['Billed to', r.customer.name],
    ['Email', r.customer.email],
    ['WhatsApp', '+91 ' + r.customer.phone.replace(/^\+?91/, '')],
    ['Item', `Live webinar seat · ${r.slot.dayLabel} ${r.slot.dateLabel}, 7–9 PM IST`],
    ['Payment status', paid ? 'Paid' : r.status === 'pending' ? 'Pending' : 'Not paid'],
    ...(paid && r.paymentId ? [['Razorpay payment ID', r.paymentId] as [string, string]] : []),
    ...(paid && r.method ? [['Payment method', r.method.toUpperCase()] as [string, string]] : []),
    ...(paid && r.paidAt ? [['Paid at', dateTimeIST(r.paidAt)] as [string, string]] : []),
  ];

  return (
    <div className="page-narrow">
      <div className="receipt">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <div className="disp" style={{ fontSize: 24, fontWeight: 800 }}>{SITE.name}</div>
            <div style={{ fontSize: 13, color: '#474D57' }}>{SITE.domain} · {email}</div>
          </div>
          <div className="disp" style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>{paid ? 'Payment receipt' : 'Order summary'}</div>
        </div>
        <table><tbody>{rows.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody></table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '18px 0 6px' }}>
          <span style={{ fontWeight: 700 }}>Total {paid ? 'paid' : 'due'}</span>
          <span className="disp" style={{ fontSize: 32, fontWeight: 800 }}>{inr(r.amountPaise)}</span>
        </div>
        <p style={{ fontSize: 12, color: '#474D57', margin: '12px 0 0' }}>
          Final amount in INR. GenZy Club is not registered under GST, so no GST is charged. No refunds as per our refund policy. This is a computer-generated receipt and needs no signature.
        </p>
      </div>
      <div className="no-print" style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <PrintButton />
        <a className="btn-secondary" href={`/thank-you?o=${encodeURIComponent(r.publicId)}&t=${encodeURIComponent(t ?? '')}`}>Back to your booking</a>
      </div>
    </div>
  );
}
