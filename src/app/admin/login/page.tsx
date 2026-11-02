import { redirect } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { input, label } from '@/components/admin/ui';
import { isAdmin } from '@/lib/auth/session';
import { loginAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight">GenZy <span className="text-brand">Admin</span></h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage sales, buyers and the page.</p>
        <ActionForm action={loginAction} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className={label}>Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required className={input} />
          </div>
          <div>
            <label htmlFor="password" className={label}>Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
          </div>
          <SubmitButton pendingLabel="Signing in…" className="w-full">Sign in</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
