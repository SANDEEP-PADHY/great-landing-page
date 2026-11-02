import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env';

export function signOrderToken(publicId: string): string {
  return createHmac('sha256', env().APP_SECRET).update(publicId).digest('base64url').slice(0, 22);
}
export function verifyOrderToken(publicId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const a = Buffer.from(signOrderToken(publicId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
