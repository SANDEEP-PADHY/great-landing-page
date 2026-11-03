import { Link, Section, Text } from '@react-email/components';
import { Cta, H, Layout, P } from './Layout';

export type ConfirmationProps = {
  name: string; slotLabel: string; whatsappLink: string; googleCalUrl: string; icsUrl: string; templateUrl: string;
  invoiceUrl: string; publicId: string; amountLabel: string; paymentId: string; bonusValue: string; contactEmail: string;
};

export function OrderConfirmation(p: ConfirmationProps) {
  return (
    <Layout preview={`Seat confirmed: ${p.slotLabel}`}>
      <H>✅ Seat confirmed, {p.name.split(' ')[0]}!</H>
      <P>You are booked for the live webinar on <b>{p.slotLabel}</b>.</P>
      {p.whatsappLink ? (
        <Cta href={p.whatsappLink} color="#16a34a">Join the WhatsApp Community</Cta>
      ) : (
        <P>We will send the WhatsApp community link very soon.</P>
      )}
      <P>
        <Link href={p.googleCalUrl}>Add to Google Calendar</Link> · <Link href={p.icsUrl}>Download .ics</Link>
      </P>
      <P>The webinar join link comes on WhatsApp and on email before the session.</P>
      <P><Link href={p.templateUrl}>Download your free landing page template</Link>{p.bonusValue ? ` (worth ${p.bonusValue})` : ''}</P>
      <Section style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: '12px 16px' }}>
        <Text style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: '20px' }}>
          Order ID: <b>{p.publicId}</b><br />Amount paid: <b>{p.amountLabel}</b><br />Payment ID: {p.paymentId}<br />
          <Link href={p.invoiceUrl}>View invoice</Link>
        </Text>
      </Section>
      <P muted>All sales are final, there are no refunds. Contact: {p.contactEmail}</P>
    </Layout>
  );
}
