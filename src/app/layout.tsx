import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// WS1 STUB: WS2 replaces this file (fonts, global css, <TrackingRoot/>).
export const metadata: Metadata = { title: 'GenZy Club', metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000') };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
