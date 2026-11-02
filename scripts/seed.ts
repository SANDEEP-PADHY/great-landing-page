import 'dotenv/config';
import { sql } from '../src/lib/db/client';
import { db } from '../src/lib/db/client';
import { siteSettings, slots } from '../src/lib/db/schema';
import { DEFAULT_SETTINGS } from '../src/lib/settings';

const SLOTS = [
  { id: 's7', dayLabel: 'Sat', dateLabel: '7 Nov', startsAt: '2026-11-07T13:30:00Z', endsAt: '2026-11-07T15:30:00Z', sort: 1 },
  { id: 's8', dayLabel: 'Sun', dateLabel: '8 Nov', startsAt: '2026-11-08T13:30:00Z', endsAt: '2026-11-08T15:30:00Z', sort: 2 },
  { id: 's9', dayLabel: 'Mon', dateLabel: '9 Nov', startsAt: '2026-11-09T13:30:00Z', endsAt: '2026-11-09T15:30:00Z', sort: 3 },
  { id: 's10', dayLabel: 'Tue', dateLabel: '10 Nov', startsAt: '2026-11-10T13:30:00Z', endsAt: '2026-11-10T15:30:00Z', sort: 4 },
];

async function main() {
  for (const s of SLOTS) {
    // upsert dates/labels; never overwrite isOpen or webinarUrl edited in admin
    await db.insert(slots).values({ ...s, startsAt: new Date(s.startsAt), endsAt: new Date(s.endsAt) })
      .onConflictDoUpdate({
        target: slots.id,
        set: { dayLabel: s.dayLabel, dateLabel: s.dateLabel, startsAt: new Date(s.startsAt), endsAt: new Date(s.endsAt), sort: s.sort },
      });
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(siteSettings).values({ key, value: value as never }).onConflictDoNothing();
  }
  console.log('seeded: 4 slots, default settings');
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
