import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { revalidateTag, unstable_cache } from 'next/cache';
import { db } from './db/client';
import { orders, slots } from './db/schema';
import type { SlotId, SlotView } from './contracts';
import { dateLabelIST, dayLabelIST } from './slot-format';

type SlotRow = typeof slots.$inferSelect;

export function toSlotView(r: SlotRow, paidSeats = 0): SlotView {
  const full = r.capacity != null && paidSeats >= r.capacity;
  return {
    id: r.id as SlotId, dayLabel: r.dayLabel, dateLabel: r.dateLabel,
    startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString(), isOpen: r.isOpen && !full,
  };
}

/** All slots including archived ones (admin). */
export async function getSlotRows(): Promise<SlotRow[]> {
  return db.select().from(slots).orderBy(asc(slots.startsAt), asc(slots.sort));
}
export async function getSlotRow(id: string): Promise<SlotRow | undefined> {
  return (await db.select().from(slots).where(eq(slots.id, id)).limit(1))[0];
}

export async function paidSeatsFor(slotId: string): Promise<number> {
  const [r] = await db.select({ c: count() }).from(orders).where(and(eq(orders.slotId, slotId), eq(orders.status, 'paid')));
  return Number(r?.c ?? 0);
}

async function loadPublicSlots(): Promise<SlotView[]> {
  const [rows, paid] = await Promise.all([
    db.select().from(slots).where(isNull(slots.archivedAt)).orderBy(asc(slots.startsAt), asc(slots.sort)),
    db.select({ slotId: orders.slotId, c: count() }).from(orders).where(eq(orders.status, 'paid')).groupBy(orders.slotId),
  ]);
  return rows.map((r) => toSlotView(r, Number(paid.find((p) => p.slotId === r.id)?.c ?? 0)));
}

const cachedSlots = unstable_cache(loadPublicSlots, ['site-slots'], { tags: ['site'], revalidate: 300 });

/** Public slots (archived hidden). isOpen = manual flag and not full; use isSlotBookable() to also check the start time. */
export async function getSlots(): Promise<SlotView[]> {
  try { return await cachedSlots(); } catch { return loadPublicSlots(); }
}

export function isSlotBookable(s: { isOpen: boolean; startsAt: Date | string; archivedAt?: Date | string | null }, now = new Date()): boolean {
  return s.isOpen && !s.archivedAt && now.getTime() < new Date(s.startsAt).getTime();
}

function bust() { try { revalidateTag('site'); } catch { /* not in a Next context */ } }

export async function updateSlot(id: SlotId, patch: { isOpen?: boolean; webinarUrl?: string | null; capacity?: number | null }): Promise<void> {
  const set: Partial<typeof slots.$inferInsert> = {};
  if (patch.isOpen !== undefined) set.isOpen = patch.isOpen;
  if (patch.webinarUrl !== undefined) set.webinarUrl = patch.webinarUrl;
  if (patch.capacity !== undefined) set.capacity = patch.capacity;
  if (Object.keys(set).length) await db.update(slots).set(set).where(eq(slots.id, id));
  bust();
}

export async function createSlot(input: { startsAt: Date; endsAt: Date; capacity?: number | null; webinarUrl?: string | null }): Promise<SlotRow> {
  const id = `s${randomBytes(4).toString('hex')}`;
  const [row] = await db.insert(slots).values({
    id, dayLabel: dayLabelIST(input.startsAt), dateLabel: dateLabelIST(input.startsAt),
    startsAt: input.startsAt, endsAt: input.endsAt, capacity: input.capacity ?? null, webinarUrl: input.webinarUrl ?? null,
    sort: Math.floor(input.startsAt.getTime() / 1000),
  }).returning();
  bust();
  return row!;
}

export async function orderCountsFor(slotId: string): Promise<{ total: number; paid: number }> {
  const [r] = await db.select({
    total: count(),
    paid: sql<number>`count(*) filter (where ${orders.status} = 'paid')`,
  }).from(orders).where(eq(orders.slotId, slotId));
  return { total: Number(r?.total ?? 0), paid: Number(r?.paid ?? 0) };
}

/**
 * Delete a slot. A slot that has any order (paid or not) is never hard-deleted, since orders reference it:
 * it is archived instead (hidden from the public page and checkout; buyers, reminders, invoices keep working).
 */
export async function removeSlot(id: SlotId): Promise<'deleted' | 'archived' | 'missing'> {
  const slot = await getSlotRow(id);
  if (!slot) return 'missing';
  const { total } = await orderCountsFor(id);
  if (total === 0) { await db.delete(slots).where(eq(slots.id, id)); bust(); return 'deleted'; }
  await db.update(slots).set({ archivedAt: new Date() }).where(eq(slots.id, id));
  bust();
  return 'archived';
}

export async function restoreSlot(id: SlotId): Promise<void> {
  await db.update(slots).set({ archivedAt: null }).where(eq(slots.id, id));
  bust();
}
