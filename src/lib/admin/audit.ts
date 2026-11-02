import 'server-only';
import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { adminAudit } from '@/lib/db/schema';
import { clientIp } from '@/lib/request';

export async function logAudit(action: string, target?: string | null, details?: unknown): Promise<void> {
  try {
    const h = await headers();
    await db.insert(adminAudit).values({
      action,
      target: target ?? null,
      details: (details ?? null) as never,
      ip: clientIp(h),
    });
  } catch (e) {
    console.error('[audit] failed to write', action, e);
  }
}
