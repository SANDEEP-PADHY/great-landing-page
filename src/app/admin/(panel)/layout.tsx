import type { ReactNode } from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { requireAdmin } from '@/lib/auth/session';
import { logoutAction } from '../login/actions';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar logout={logoutAction} />
      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7">{children}</main>
    </div>
  );
}
