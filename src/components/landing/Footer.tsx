import { LEGAL_LINKS, SITE } from '@/content/landing';

export function Footer({ email, phone, bottomPad = 120 }: { email?: string; phone?: string; bottomPad?: number }) {
  const mail = email || SITE.defaultContactEmail;
  return (
    <div data-section="footer" style={{ padding: `24px 0 ${bottomPad}px` }}>
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#2F343C' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
          {LEGAL_LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          <a href={`mailto:${mail}`}>{mail}</a>
          {phone ? <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a> : null}
        </div>
        <p style={{ margin: 0 }}>₹1.4L in 7 days is my personal result. Results vary. This is education, not an income guarantee. The free subscription goes only to full live attendees who complete the process shared at the end. GenZy Club is not affiliated with Anthropic or Meta.</p>
        <p style={{ margin: 0 }}>© 2026 GenZy Club · {SITE.domain}</p>
      </div>
    </div>
  );
}
