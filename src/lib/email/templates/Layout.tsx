import { Body, Button, Container, Head, Html, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';

export const BRAND = '#1D4ED8';

export function Layout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#eef0f4', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '28px 24px', maxWidth: 520 }}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: '0 0 16px' }}>GenZy Club</Text>
          {children}
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 28 }}>
            Questions? Reply to this email or write to genzyclub.com@gmail.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function H({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>{children}</Text>;
}
export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={{ fontSize: 15, lineHeight: '22px', color: muted ? '#6b7280' : '#374151', margin: '0 0 12px' }}>{children}</Text>;
}
export function Cta({ href, children, color = BRAND }: { href: string; children: ReactNode; color?: string }) {
  return (
    <Section style={{ margin: '16px 0' }}>
      <Button href={href} style={{ backgroundColor: color, color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 24px', borderRadius: 12 }}>
        {children}
      </Button>
    </Section>
  );
}
