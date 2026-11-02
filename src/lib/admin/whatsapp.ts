export function waLink(phoneE164: string, text?: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export function abandonedMessage(name: string, slotLabel: string, slotId: string): string {
  const base = (process.env.APP_URL || 'https://genzyclub.tech').replace(/\/$/, '');
  const first = name.trim().split(/\s+/)[0] ?? name;
  return `Hi ${first}, aapka GenZy Club webinar seat (${slotLabel}) abhi book nahi hua. Yeh raha link: ${base}/?slot=${slotId}`;
}
