'use server';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/admin/action-state';
import { logAudit } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { emailLog } from '@/lib/db/schema';

export async function retryEmailAction(id: string, _p: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { error: 'Bad id.' };
  // the worker's retry job picks queued rows up again
  await db.update(emailLog).set({ status: 'queued', attempts: 0, error: null }).where(and(eq(emailLog.id, id), eq(emailLog.status, 'failed')));
  await logAudit('email.retry', id);
  revalidatePath('/admin/emails');
  return { ok: true, message: 'Queued' };
}
