import type { SlotView } from './contracts';

const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function googleCalendarUrl(slot: Pick<SlotView, 'startsAt' | 'endsAt'>, details: string): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: 'GenZy Club Live Webinar',
    dates: `${fmt(slot.startsAt)}/${fmt(slot.endsAt)}`, details,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function buildIcs(o: { uid: string; slot: Pick<SlotView, 'startsAt' | 'endsAt'>; description: string; url?: string | null }): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GenZy Club//Webinar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${o.uid}@genzyclub.tech`, `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(o.slot.startsAt)}`, `DTEND:${fmt(o.slot.endsAt)}`,
    'SUMMARY:GenZy Club Live Webinar', `DESCRIPTION:${esc(o.description)}`,
    ...(o.url ? [`URL:${o.url}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Webinar starts in 30 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
