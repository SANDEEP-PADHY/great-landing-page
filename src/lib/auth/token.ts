// Edge-safe JWT helpers (used by middleware and by server code). [WS3]
import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE = 'gz_admin';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

function key(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 32) throw new Error('ADMIN_JWT_SECRET must be set (32+ chars)');
  return new TextEncoder().encode(s);
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('owner')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(key());
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return payload.sub === 'owner';
  } catch {
    return false;
  }
}
