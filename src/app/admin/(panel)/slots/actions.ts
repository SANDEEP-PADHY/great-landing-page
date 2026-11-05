'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/admin/action-state';
import { logAudit } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/auth/session';
import type { SlotId } from '@/lib/contracts';
import { sendSlotReminder } from '@/lib/email/send';
import { createSlot, getSlotRow, orderCountsFor, removeSlot, restoreSlot, updateSlot } from '@/lib/slots';
import { db } from '@/lib/db/client';
import { slots } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

const SlotIdSchema = z.string().min(1).max(40);

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

const IST = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
const CreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a start time.'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Pick an end time.'),
  capacity: z.string().trim().regex(/^\d{0,5}$/, 'Capacity must be a whole number.'),
  webinarUrl: z.string().trim().max(300).refine((v) => !v || /^https:\/\//.test(v), 'Enter a full https:// link.'),
});

export async function createSlotAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = CreateSchema.safeParse({
    date: fd.get('date'), start: fd.get('start'), end: fd.get('end'),
    capacity: String(fd.get('capacity') ?? ''), webinarUrl: String(fd.get('webinarUrl') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  const v = parsed.data;
  const startsAt = IST(v.date, v.start), endsAt = IST(v.date, v.end);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { error: 'Invalid date or time.' };
  if (endsAt <= startsAt) return { error: 'End time must be after the start time.' };
  if (startsAt.getTime() <= Date.now()) return { error: 'Start time must be in the future.' };
  const capacity = v.capacity ? Number(v.capacity) : null;
  if (capacity !== null && capacity < 1) return { error: 'Capacity must be at least 1, or leave it empty for unlimited.' };
  const [dupe] = await db.select({ id: slots.id }).from(slots).where(and(eq(slots.startsAt, startsAt), isNull(slots.archivedAt))).limit(1);
  if (dupe) return { error: 'A slot already starts at that exact time.' };
  const row = await createSlot({ startsAt, endsAt, capacity, webinarUrl: v.webinarUrl || null });
  await logAudit('slot.create', row.id, { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), capacity });
  revalidatePath('/admin/slots');
  return { ok: true, message: `Added ${row.dayLabel} ${row.dateLabel}. It is live on the site now.` };
}

export async function saveCapacityAction(slotId: SlotId, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!SlotIdSchema.safeParse(slotId).success || !(await getSlotRow(slotId))) return { error: 'Unknown slot.' };
  const raw = String(fd.get('capacity') ?? '').trim();
  if (!/^\d{0,5}$/.test(raw) || (raw && Number(raw) < 1)) return { error: 'Enter a whole number, or leave empty for unlimited.' };
  await updateSlot(slotId, { capacity: raw ? Number(raw) : null });
  await logAudit('slot.capacity', slotId, { capacity: raw || null });
  revalidatePath('/admin/slots');
  return { ok: true, message: 'Saved.' };
}

/**
 * Delete a slot. No orders at all: removed for good. Any order (paid or not): the slot is archived instead (hidden
 * from the public page and checkout, buyers keep their booking, reminders and invoices). If it has paid buyers the
 * admin must tick the confirmation box.
 */
export async function deleteSlotAction(slotId: SlotId, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!SlotIdSchema.safeParse(slotId).success || !(await getSlotRow(slotId))) return { error: 'Unknown slot.' };
  const { paid, total } = await orderCountsFor(slotId);
  if (paid > 0 && fd.get('confirmPaid') !== 'on') {
    return { error: `This slot has ${paid} paid buyer${paid === 1 ? '' : 's'}. Tick the box to confirm you understand.` };
  }
  let outcome: Awaited<ReturnType<typeof removeSlot>>;
  try { outcome = await removeSlot(slotId); } catch { return { error: 'Could not delete (a new order may have just come in). Reload and try again.' }; }
  await logAudit('slot.delete', slotId, { outcome, paid, orders: total });
  revalidatePath('/admin/slots');
  if (outcome === 'deleted') return { ok: true, message: 'Slot deleted.' };
  return { ok: true, message: `Archived: hidden from the site. ${total} existing order${total === 1 ? '' : 's'} kept.` };
}

export async function restoreSlotAction(slotId: SlotId, _p: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!SlotIdSchema.safeParse(slotId).success || !(await getSlotRow(slotId))) return { error: 'Unknown slot.' };
  await restoreSlot(slotId);
  await logAudit('slot.restore', slotId, {});
  revalidatePath('/admin/slots');
  return { ok: true, message: 'Restored.' };
}
