'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/admin/action-state';
import { logAudit } from '@/lib/admin/audit';
import { verifyAdminLogin } from '@/lib/auth/password';
import { clearLoginFailures, loginWaitMinutes, recordLoginFailure } from '@/lib/auth/rate-limit';
import { clearAdminSession, setAdminSession } from '@/lib/auth/session';
import { clientIp } from '@/lib/request';

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = clientIp(await headers()) ?? 'unknown';
  const wait = loginWaitMinutes(ip);
  if (wait > 0) return { error: `Too many failed attempts. Try again in ${wait} minute${wait === 1 ? '' : 's'}.` };

  const email = String(fd.get('email') ?? '');
  const password = String(fd.get('password') ?? '');
  if (!(await verifyAdminLogin(email, password))) {
    recordLoginFailure(ip);
    await logAudit('login.failed', email.slice(0, 120) || null);
    const left = loginWaitMinutes(ip);
    return { error: left > 0 ? `Too many failed attempts. Try again in ${left} minutes.` : 'Wrong email or password.' };
  }
  clearLoginFailures(ip);
  await setAdminSession();
  await logAudit('login.ok');
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await clearAdminSession();
  await logAudit('logout');
  redirect('/admin/login');
}
