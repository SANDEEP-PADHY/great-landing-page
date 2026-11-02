import { Cta, H, Layout, P } from './Layout';

export function AbandonedCheckout(p: { name: string; slotLabel: string; resumeUrl: string; priceLabel: string; offerEnds: string }) {
  return (
    <Layout preview={`Your seat for ${p.slotLabel} is not booked yet`}>
      <H>Your seat is not booked yet</H>
      <P>Hi {p.name.split(' ')[0]}, you started booking the live webinar for <b>{p.slotLabel}</b> but did not finish.</P>
      <P>The launch price of {p.priceLabel} ends {p.offerEnds}. Seats are limited per batch.</P>
      <Cta href={p.resumeUrl}>Complete my booking</Cta>
    </Layout>
  );
}
