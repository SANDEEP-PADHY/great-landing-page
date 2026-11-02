import type { Metadata } from 'next';
import { LegalPage, getContact } from '@/components/site/LegalPage';
import { SITE } from '@/content/landing';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Privacy policy', alternates: { canonical: '/privacy' } };

export default async function Page() {
  const c = await getContact();
  return (
    <LegalPage title="Privacy policy">
      <p>This policy explains what personal data {SITE.name} ({SITE.domain}) collects, why, and your rights under India&apos;s Digital Personal Data Protection Act, 2023.</p>
      <h2>Data we collect</h2>
      <ul>
        <li><strong>You give us:</strong> name, WhatsApp number and email when you book.</li>
        <li><strong>Payment:</strong> payment status, method and transaction IDs from Razorpay. We never see card numbers, UPI PINs or bank logins.</li>
        <li><strong>Device and usage data:</strong> pages viewed, clicks, scroll depth, time on page, device, browser, approximate location (country), IP address and how you arrived (for example the ad or link you came from).</li>
      </ul>
      <h2>Cookies, Meta Pixel and Conversions API</h2>
      <p>We use first-party cookies to recognise a visit and measure what works. We also use the <strong>Meta Pixel</strong> in your browser and Meta&apos;s <strong>Conversions API</strong> from our server to measure and improve our ads. These send events such as page views, button clicks, checkout steps and purchases to Meta, together with identifiers such as cookie IDs and, after you book, your email, phone number and name in hashed (one-way encrypted) form. Meta uses this under its own privacy policy. You can block cookies in your browser or limit ad tracking in your Facebook ad settings.</p>
      <h2>Why we use it</h2>
      <ul>
        <li>To take your booking, send confirmations, reminders and the webinar link.</li>
        <li>To provide support and keep records for tax and legal needs.</li>
        <li>To understand and improve our site and advertising.</li>
        <li>To prevent fraud and abuse.</li>
      </ul>
      <h2>Who we share it with</h2>
      <p>Only service providers who help us run the business: <strong>Razorpay</strong> (payments), <strong>Resend</strong> (email), <strong>Meta</strong> (advertising measurement) and our hosting provider. We do not sell your data.</p>
      <h2>How long we keep it</h2>
      <p>Booking and payment records are kept for up to 8 years for accounting and legal reasons. Analytics data is kept for up to 24 months. You can ask us to delete data we are not required to keep.</p>
      <h2>Your rights</h2>
      <p>You can ask to access, correct or erase your personal data, withdraw consent, or raise a grievance. Email <a href={`mailto:${c.email}`}>{c.email}</a> and we will respond within 30 days.</p>
      <h2>Changes</h2>
      <p>We may update this policy; the date at the top shows the latest version.</p>
    </LegalPage>
  );
}
