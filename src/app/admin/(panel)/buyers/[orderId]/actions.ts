'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/admin/action-state';
import { logAudit } from '@/lib/admin/audit';
import { SLOT_IDS } from '@/lib/contracts';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { orders } from '@/lib/db/schema';
import { resendConfirmation } from '@/lib/email/send';
import { changeOrderSlot } from '@/lib/orders';

const Id = z.string().uuid();

export async function changeSlotAction(orderId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const slot = z.enum(SLOT_IDS).safeParse(fd.get('slotId'));
  if (!Id.safeParse(orderId).success || !slot.success) return { error: 'Pick a valid slot.' };
  try {
    await changeOrderSlot(orderId, slot.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not change the slot.' };
  }
  await logAudit('order.change_slot', orderId, { slotId: slot.data });
  revalidatePath(`/admin/buyers/${orderId}`);
  return { ok: true, message: 'Slot changed.' };
}

export async function toggleFlagAction(orderId: string, field: 'watchedFull' | 'bonusGiven', value: boolean, _p: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!Id.safeParse(orderId).success) return { error: 'Bad order id.' };
  await db.update(orders).set({ [field]: value, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await logAudit(`order.${field}`, orderId, { value });
  revalidatePath(`/admin/buyers/${orderId}`);
  revalidatePath('/admin/buyers');
  return { ok: true, message: 'Updated.' };
}

export async function resendConfirmationAction(orderId: string, _p: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!Id.safeParse(orderId).success) return { error: 'Bad order id.' };
  try {
    await resendConfirmation(orderId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not send the email.' };
  }
  await logAudit('order.resend_confirmation', orderId);
  revalidatePath(`/admin/buyers/${orderId}`);
  return { ok: true, message: 'Confirmation email queued.' };
}

export async function saveNoteAction(orderId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const note = z.string().max(2000).safeParse(String(fd.get('note') ?? ''));
  if (!Id.safeParse(orderId).success || !note.success) return { error: 'Note is too long (2000 characters max).' };
  await db.update(orders).set({ adminNote: note.data.trim() || null, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await logAudit('order.note', orderId);
  revalidatePath(`/admin/buyers/${orderId}`);
  return { ok: true, message: 'Note saved.' };
}
