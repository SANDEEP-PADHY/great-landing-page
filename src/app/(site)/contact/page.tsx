import type { Metadata } from 'next';
import { LegalPage, getContact } from '@/components/site/LegalPage';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Contact us', alternates: { canonical: '/contact' } };

export default async function Page() {
  const c = await getContact();
  return (
    <LegalPage title="Contact us">
      <p>Questions about your booking, payment or the webinar? Write to us and include your order ID (it looks like GZ-ABC123) if you have one.</p>
      <ul>
        <li>Email: <a href={`mailto:${c.email}`}>{c.email}</a></li>
        {c.phone ? <li>Phone / WhatsApp: <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></li> : null}
      </ul>
      <p><strong>We reply within 24 hours.</strong></p>
    </LegalPage>
  );
}
