'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cx } from './ui';

const NAV: [string, string][] = [
  ['/admin', 'Dashboard'], ['/admin/buyers', 'Buyers'], ['/admin/abandoned', 'Abandoned'], ['/admin/analytics', 'Analytics'],
  ['/admin/slots', 'Slots'], ['/admin/content', 'Content & media'], ['/admin/settings', 'Settings'], ['/admin/emails', 'Emails'], ['/admin/tracking', 'Tracking'],
];

export function Sidebar({ logout }: { logout: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  return (
    <aside className="border-line bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-3 md:py-5">
        <Link href="/admin" className="text-base font-extrabold tracking-tight">GenZy <span className="text-brand">Admin</span></Link>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Toggle menu"
          className="rounded-lg border border-line px-2.5 py-1.5 text-sm md:hidden">{open ? 'Close' : 'Menu'}</button>
      </div>
      <nav className={cx('flex-col gap-0.5 px-2 pb-3 md:flex', open ? 'flex' : 'hidden')}>
        {NAV.map(([href, name]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={cx('rounded-lg px-3 py-2 text-sm font-medium', active(href) ? 'bg-brand-soft text-brand' : 'text-slate-700 hover:bg-slate-50')}>{name}</Link>
        ))}
        <form action={logout} className="mt-2 border-t border-line pt-2">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">Logout</button>
        </form>
      </nav>
    </aside>
  );
}
