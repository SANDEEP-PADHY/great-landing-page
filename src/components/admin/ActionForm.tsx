'use client';
import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/admin/action-state';
import { btn, btnPrimary, cx } from './ui';

export function SubmitButton({ children, pendingLabel = 'Saving…', variant = 'primary', className }: { children: ReactNode; pendingLabel?: string; variant?: 'primary' | 'plain'; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={cx(variant === 'primary' ? btnPrimary : btn, className)}>{pending ? pendingLabel : children}</button>;
}

/** Wraps a server action returning ActionState and shows its message inline. */
export function ActionForm({ action, children, className }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{state.error}</p>}
      {state.ok && state.message && <p role="status" className="mt-2 text-sm font-medium text-emerald-700">{state.message}</p>}
    </form>
  );
}

/** Two-step confirm button for risky one-click actions (sending emails, etc.). */
export function ConfirmForm({ action, label, confirmLabel = 'Confirm', children }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; label: string; confirmLabel?: string; children?: ReactNode }) {
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <details className="group">
        <summary className={cx(btn, 'cursor-pointer list-none')}>{label}</summary>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-slate-50 p-2 text-sm">
          {children}
          <SubmitButton pendingLabel="Working…">{confirmLabel}</SubmitButton>
        </div>
      </details>
      {state.error && <span role="alert" className="text-sm font-medium text-red-700">{state.error}</span>}
      {state.ok && state.message && <span role="status" className="text-sm font-medium text-emerald-700">{state.message}</span>}
    </form>
  );
}
