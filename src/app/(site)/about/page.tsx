import type { Metadata } from 'next';
import { LegalPage, getContact } from '@/components/site/LegalPage';
import { SITE } from '@/content/landing';

export const revalidate = 300;
export const metadata: Metadata = { title: 'About us', alternates: { canonical: '/about' } };

export default async function Page() {
  const c = await getContact();
  return (
    <LegalPage title="About GenZy Club">
      <p>GenZy Club ({SITE.domain}) runs live educational webinars that teach students, working professionals and creators how to build and sell their own digital products with the help of AI.</p>
      <h2>Your host</h2>
      <p><strong>{SITE.host}</strong> is the founder and host. He wrote an ebook on getting the most out of AI, set up a fully automated store, ran Meta ads and shares that exact process live in the webinar.</p>
      <h2>What we sell</h2>
      <p>A seat in a live 2-hour online webinar (with live Q&amp;A), a WhatsApp community and a free landing page template. We sell education only. We do not sell physical goods.</p>
      <h2>Contact</h2>
      <p>Email: <a href={`mailto:${c.email}`}>{c.email}</a>{c.phone ? <> · Phone: {c.phone}</> : null}</p>
      <p>GenZy Club is not affiliated with, endorsed by or sponsored by Meta.</p>
    </LegalPage>
  );
}
