import { Cta, H, Layout, P } from './Layout';

export function SessionReminder(p: { name: string; slotLabel: string; webinarUrl: string; whatsappLink: string }) {
  return (
    <Layout preview="Your webinar starts soon">
      <H>Starts at 7 PM today</H>
      <P>Hi {p.name.split(' ')[0]}, your session ({p.slotLabel}) is about to begin.</P>
      <Cta href={p.webinarUrl}>Join webinar</Cta>
      {p.whatsappLink ? <P>Updates: <a href={p.whatsappLink}>WhatsApp community</a></P> : null}
      <P muted>Stay until the end to claim the free Claude subscription.</P>
    </Layout>
  );
}
