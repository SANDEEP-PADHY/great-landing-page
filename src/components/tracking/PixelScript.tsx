'use client';
import Script from 'next/script';
import { drainPendingPixel } from '@/lib/tracking/client';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';

/** Loads fbevents.js and inits the Pixel. PageView is fired through track('page_view') so it carries an event_id. */
export function PixelScript() {
  if (!PIXEL_ID) return null;
  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      onReady={() => drainPendingPixel()}
      dangerouslySetInnerHTML={{
        __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID.replace(/[^0-9]/g, '')}');`,
      }}
    />
  );
}
