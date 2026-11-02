'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/admin/action-state';
import { logAudit } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/auth/session';
import { SLOT_IDS, type SlotId } from '@/lib/contracts';
import { sendSlotReminder } from '@/lib/email/send';
import { updateSlot } from '@/lib/slots';

const SlotIdSchema = z.enum(SLOT_IDS);

export async function toggleSlotAction(slotId: SlotId, open: boolean, _p: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!SlotIdSchema.safeParse(slotId).success) return { error: 'Unknown slot.' };
  await updateSlot(slotId, { isOpen: open });
  await logAudit('slot.toggle', slotId, { open });
  revalidatePath('/admin/slots');
  return { ok: true };
}

export async function saveWebinarUrlAction(slotId: SlotId, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!SlotIdSchema.safeParse(slotId).success) return { error: 'Unknown slot.' };
  const raw = String(fd.get('webinarUrl') ?? '').trim();
  if (raw && !z.string().url().max(300).regex(/^https:\/\//).safeParse(raw).success) return { error: 'Enter a full https:// link.' };
  await updateSlot(slotId, { webinarUrl: raw || null });
  await logAudit('slot.webinar_url', slotId, { webinarUrl: raw || null });
  revalidatePath('/admin/slots');
  return { ok: true, message: 'Saved.' };
}

export async function sendReminderAction(slotId: SlotId, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!SlotIdSchema.safeParse(slotId).success) return { error: 'Unknown slot.' };
  const resend = fd.get('resend') === 'on';
  try {
    const res = await sendSlotReminder(slotId, { resend });
    await logAudit('slot.send_reminder', slotId, { ...res, resend });
    revalidatePath('/admin/slots');
    return { ok: true, message: `Sent ${res.sent}, failed ${res.failed}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not send reminders.' };
  }
}
