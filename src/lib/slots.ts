import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { revalidateTag, unstable_cache } from 'next/cache';
import { db } from './db/client';
import { slots } from './db/schema';
import type { SlotId, SlotView } from './contracts';

type SlotRow = typeof slots.$inferSelect;

export function toSlotView(r: SlotRow): SlotView {
  return {
    id: r.id as SlotId, dayLabel: r.dayLabel, dateLabel: r.dateLabel,
    startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString(), isOpen: r.isOpen,
  };
}

export async function getSlotRows(): Promise<SlotRow[]> {
  return db.select().from(slots).orderBy(asc(slots.sort));
}
export async function getSlotRow(id: string): Promise<SlotRow | undefined> {
  return (await db.select().from(slots).where(eq(slots.id, id)).limit(1))[0];
}

const cachedSlots = unstable_cache(async () => (await getSlotRows()).map(toSlotView), ['site-slots'], {
  tags: ['site'], revalidate: 300,
});

/** isOpen here is the manual flag only. Use isSlotBookable() to also check the start time. */
export async function getSlots(): Promise<SlotView[]> {
  try { return await cachedSlots(); } catch { return (await getSlotRows()).map(toSlotView); }
}

export function isSlotBookable(s: { isOpen: boolean; startsAt: Date | string }, now = new Date()): boolean {
  return s.isOpen && now.getTime() < new Date(s.startsAt).getTime();
}

export async function updateSlot(id: SlotId, patch: { isOpen?: boolean; webinarUrl?: string | null }): Promise<void> {
  const set: Partial<typeof slots.$inferInsert> = {};
  if (patch.isOpen !== undefined) set.isOpen = patch.isOpen;
  if (patch.webinarUrl !== undefined) set.webinarUrl = patch.webinarUrl;
  if (Object.keys(set).length) await db.update(slots).set(set).where(eq(slots.id, id));
  try { revalidateTag('site'); } catch { /* not in a Next context */ }
}
