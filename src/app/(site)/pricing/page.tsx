import type { Metadata } from 'next';
import { getPublicSettings } from '@/lib/settings';
import { getPriceView } from '@/lib/pricing';
import { LegalPage } from '@/components/site/LegalPage';
import { priceCopy } from '@/components/landing/format';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Pricing', alternates: { canonical: '/pricing' } };

export default async function Page() {
  const s = await getPublicSettings();
  const p = priceCopy(getPriceView(s, new Date()));
  return (
    <LegalPage title="Pricing">
      <table>
        <thead><tr><th>Product</th><th>Price</th></tr></thead>
        <tbody>
          <tr>
            <td>Live webinar seat (2 hours, 7–9 PM IST, your choice of date)</td>
            <td>{p.isOffer ? <><s>{p.regular}</s> <strong>{p.now}</strong> Diwali offer until {p.till} 2026, then {p.regular}</> : <strong>{p.now}</strong>}</td>
          </tr>
        </tbody>
      </table>
      <h2>What is included</h2>
      <ul>
        <li>1 live webinar seat on the date you choose</li>
        <li>The complete automated product system, with live Q&amp;A</li>
        <li>WhatsApp community access</li>
        <li>Landing page template (bonus)</li>
        <li>Free Claude subscription worth {s.claude_bonus_value || '₹2,000'} for every attendee who stays for the full live session and follows the claim steps</li>
      </ul>
      <p>All prices are in Indian Rupees (INR) and are final. GenZy Club is not registered under GST, so no GST is added. Payments are processed securely by Razorpay (UPI, cards, netbanking). See our <a href="/refund-policy">refund policy</a>.</p>
    </LegalPage>
  );
}
