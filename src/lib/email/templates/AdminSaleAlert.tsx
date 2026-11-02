import { H, Layout, P } from './Layout';

export function AdminSaleAlert(p: { amountLabel: string; name: string; slotLabel: string; utmContent: string; publicId: string }) {
  return (
    <Layout preview={`New sale ${p.amountLabel}`}>
      <H>New sale {p.amountLabel}</H>
      <P>{p.name} · {p.slotLabel}</P>
      <P muted>Order {p.publicId} · creative: {p.utmContent || 'n/a'}</P>
    </Layout>
  );
}
