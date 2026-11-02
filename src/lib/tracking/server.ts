import 'server-only';
// WS1 STUB: WS4 replaces this file. Must never throw.
export async function recordServerEvent(i: {
  name: 'lead' | 'purchase'; eventId: string; orderId: string; customerId: string; valuePaise?: number;
}): Promise<void> {
  console.log('[tracking-stub] recordServerEvent', i.name, i.eventId);
}
