'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/admin/action-state';
import { logAudit } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { orders } from '@/lib/db/schema';

export async function markContactedAction(orderId: string, contacted: boolean, _p: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(orderId).success) return { error: 'Bad order id.' };
  await db.update(orders).set({ contactedAt: contacted ? new Date() : null, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await logAudit(contacted ? 'order.contacted' : 'order.uncontacted', orderId);
  revalidatePath('/admin/abandoned');
  return { ok: true };
}
