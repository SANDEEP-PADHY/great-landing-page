import 'dotenv/config';
import { sql } from '../src/lib/db/client';
import { db } from '../src/lib/db/client';
import { siteSettings, slots } from '../src/lib/db/schema';
import { count, eq } from 'drizzle-orm';
import { DEFAULT_SETTINGS } from '../src/lib/settings';

const SLOTS = [
  { id: 's7', dayLabel: 'Sat', dateLabel: '7 Nov', startsAt: '2026-11-07T13:30:00Z', endsAt: '2026-11-07T15:30:00Z', sort: 1 },
  { id: 's8', dayLabel: 'Sun', dateLabel: '8 Nov', startsAt: '2026-11-08T13:30:00Z', endsAt: '2026-11-08T15:30:00Z', sort: 2 },
  { id: 's9', dayLabel: 'Mon', dateLabel: '9 Nov', startsAt: '2026-11-09T13:30:00Z', endsAt: '2026-11-09T15:30:00Z', sort: 3 },
  { id: 's10', dayLabel: 'Tue', dateLabel: '10 Nov', startsAt: '2026-11-10T13:30:00Z', endsAt: '2026-11-10T15:30:00Z', sort: 4 },
];

async function main() {
  // Slots are managed in the admin panel. Seed the initial four only once, ever: the `slots_seeded`
  // flag stops a deploy from re-creating (or resetting dates of) slots that were deleted or edited in admin.
  const [flag] = await db.select().from(siteSettings).where(eq(siteSettings.key, 'slots_seeded')).limit(1);
  if (!flag) {
    const [existing] = await db.select({ c: count() }).from(slots);
    if (!Number(existing?.c ?? 0)) {
      for (const s of SLOTS) {
        await db.insert(slots).values({ ...s, startsAt: new Date(s.startsAt), endsAt: new Date(s.endsAt) }).onConflictDoNothing();
      }
    }
    await db.insert(siteSettings).values({ key: 'slots_seeded', value: true as never }).onConflictDoNothing();
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(siteSettings).values({ key, value: value as never }).onConflictDoNothing();
  }
  console.log('seeded: default settings (slots only on first run)');
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
