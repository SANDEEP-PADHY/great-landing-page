import type { Metadata } from 'next';
import { LegalPage, getContact } from '@/components/site/LegalPage';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Refund and cancellation policy', alternates: { canonical: '/refund-policy' } };

export default async function Page() {
  const c = await getContact();
  return (
    <LegalPage title="Refund and cancellation policy">
      <p><strong>No refunds.</strong> The price of a seat is final once payment is made, so please choose your date carefully before you pay.</p>
      <h2>If we cancel a session</h2>
      <p>If GenZy Club cancels or reschedules the session you booked, you can either <strong>switch to another batch for free</strong> or ask for a <strong>full refund</strong>. Refunds are made to the original payment method within 7 working days of your request.</p>
      <h2>Double or failed payments</h2>
      <p>If money was deducted but you did not receive a confirmation, or you were charged twice for the same booking, write to us and we will fix it or refund the extra amount within 7 working days. Failed payments are normally reversed by your bank automatically within 5 to 7 working days.</p>
      <h2>How to reach us</h2>
      <p>Email <a href={`mailto:${c.email}`}>{c.email}</a> with your order ID. We reply within 24 hours.</p>
    </LegalPage>
  );
}
