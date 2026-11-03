import type { Metadata } from 'next';
import { LegalPage, getContact } from '@/components/site/LegalPage';
import { SITE } from '@/content/landing';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Terms and conditions', alternates: { canonical: '/terms' } };

export default async function Page() {
  const c = await getContact();
  return (
    <LegalPage title="Terms and conditions">
      <p>By booking a seat on {SITE.domain} you agree to these terms. &ldquo;We&rdquo; means GenZy Club, operated by {SITE.host}.</p>
      <h2>1. Service</h2>
      <p>We sell a seat in a live, online educational webinar, plus the bonuses described on the booking page (WhatsApp community and a free landing page template). Join links are sent on WhatsApp and email before the session.</p>
      <h2>2. Eligibility</h2>
      <p>You must be at least 18, or use the service with a parent or guardian&apos;s consent. You must give a correct name, email and WhatsApp number.</p>
      <h2>3. Payment</h2>
      <p>Payments are made in INR through Razorpay (UPI, cards, netbanking). We never see or store your card or UPI details. The amount shown at checkout is final.</p>
      <h2>4. Slot choice</h2>
      <p>You choose one date at booking. You can ask us to move you to another open date before your session starts, subject to availability. Missing your session does not entitle you to a refund. See the <a href="/refund-policy">refund policy</a>.</p>
      <h2>5. Conduct</h2>
      <p>Be respectful in the webinar and community. Do not record, share or resell the session, join links or materials. We may remove anyone who abuses others or breaks these terms, without refund.</p>
      <h2>6. Intellectual property</h2>
      <p>All content, templates and materials remain our property. You get a personal, non-transferable licence to use them for your own projects.</p>
      <h2>7. Disclaimers</h2>
      <ul>
        <li><strong>Earnings:</strong> ₹1.2 lakh in 7 days is the host&apos;s personal result. Results vary and depend on your effort, market and skills. This is education, not an income guarantee.</li>
        <li><strong>Template bonus:</strong> available to every paid buyer as a download after payment, for personal use as described in section 6.</li>
        <li><strong>No affiliation:</strong> GenZy Club is not affiliated with, endorsed by or sponsored by Meta.</li>
      </ul>
      <h2>8. Limitation of liability</h2>
      <p>To the maximum extent allowed by law, our total liability for any claim is limited to the amount you paid for your seat. We are not liable for indirect or consequential losses, or for outages of third-party platforms.</p>
      <h2>9. Governing law</h2>
      <p>These terms are governed by the laws of India. Courts in India have jurisdiction over any dispute.</p>
      <h2>10. Contact</h2>
      <p>Questions: <a href={`mailto:${c.email}`}>{c.email}</a>.</p>
    </LegalPage>
  );
}
