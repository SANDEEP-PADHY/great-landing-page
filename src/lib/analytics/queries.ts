import 'server-only';
// WS1 STUB: WS4 replaces this file with real queries of the same names and types.
import type { DateRange } from '../contracts';

export async function getKpis(_r: DateRange) {
  return { revenuePaise: 0, sales: 0, revenueTodayPaise: 0, visitors: 0, visitorToPurchasePct: 0, checkoutToPurchasePct: 0, avgSalesPerDay: 0, abandoned: 0 };
}
export async function getCapiHealth() {
  return { pixelId: '', sent24h: 0, pending: 0, failed24h: 0, dedupPairs24h: 0 } as {
    pixelId: string; sent24h: number; pending: number; failed24h: number; dedupPairs24h: number;
    lastError?: { message: string; fbtraceId?: string; at: string };
  };
}
