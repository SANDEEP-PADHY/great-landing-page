import type { ReactNode } from 'react';
import Link from 'next/link';
import { getPublicSettings } from '@/lib/settings';
import { SITE } from '@/content/landing';
import { TrackingRoot } from '@/components/tracking/TrackingRoot';
import { Footer } from '@/components/landing/Footer';

export type LegalContact = { email: string; phone: string };

export async function getContact(): Promise<LegalContact> {
  const s = await getPublicSettings();
  return { email: s.contact_email || SITE.defaultContactEmail, phone: s.contact_phone || '' };
}

export async function LegalPage({ title, updated = '2 November 2026', children }: { title: string; updated?: string; children: ReactNode }) {
  const c = await getContact();
  return (
    <>
      <TrackingRoot pageType="legal" />
      <div className="legal-head">
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px' }}>
          <Link href="/" className="disp" style={{ fontWeight: 800, fontSize: 20, color: '#0E1013', textDecoration: 'none' }}>{SITE.name}</Link>
          <Link href="/" style={{ fontSize: 14, fontWeight: 600 }}>← Back to webinar</Link>
        </div>
      </div>
      <main className="prose">
        <h1>{title}</h1>
        <p className="updated">Last updated: {updated}</p>
        {children}
      </main>
      <Footer email={c.email} phone={c.phone} bottomPad={32} />
    </>
  );
}
