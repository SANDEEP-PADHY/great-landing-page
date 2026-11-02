'use server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/admin/action-state';
import { logAudit } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/auth/session';
import { updateSettings } from '@/lib/settings';

export async function saveTestCodeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const code = String(fd.get('code') ?? '').trim();
  if (code && !/^[A-Za-z0-9_-]{3,40}$/.test(code)) return { error: 'Test event codes look like TEST12345.' };
  await updateSettings({ capi_test_event_code: code });
  await logAudit('settings.capi_test_code', null, { set: code !== '' });
  revalidatePath('/admin/tracking');
  return { ok: true, message: code ? 'Test code saved. Server events now go to Test events.' : 'Test code cleared. Events go to production.' };
}
