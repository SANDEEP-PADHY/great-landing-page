import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import { SITE } from '@/content/landing';

const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-body' });
const display = Inter_Tight({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--font-display' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? `https://${SITE.domain}`),
  title: { default: SITE.title, template: `%s | ${SITE.name}` },
  description: SITE.description,
};

export const viewport: Viewport = {
  themeColor: '#D9DCE2',
  width: 'device-width',
  initialScale: 1,
};

// TrackingRoot is rendered per page (landing / thank_you / legal) because its `pageType` prop
// differs by route, and it must not run inside /admin.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
