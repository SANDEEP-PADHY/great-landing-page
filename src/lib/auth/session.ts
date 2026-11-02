import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, SESSION_MAX_AGE_S, signAdminToken, verifyAdminToken } from './token';

export async function setAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await signAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

/** Pages and server actions: redirects to the login page when not signed in. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}

/** Route handlers: returns a 401 response when not signed in, otherwise null. */
export async function denyUnlessAdmin(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
