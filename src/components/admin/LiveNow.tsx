'use client';
import { useEffect, useState } from 'react';

type Live = { count: number; recent: { name: string; path: string; at: string }[] };

export function LiveNow({ initial }: { initial: Live }) {
  const [live, setLive] = useState<Live>(initial);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/admin/live', { cache: 'no-store' });
        if (r.ok && !stop) setLive((await r.json()) as Live);
      } catch { /* keep last value */ }
    };
    const id = setInterval(tick, 30_000);
    return () => { stop = true; clearInterval(id); };
  }, []);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
        <span className="text-3xl font-bold tabular-nums">{live.count}</span>
        <span className="text-sm text-muted">visitors in the last 5 min</span>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {live.recent.slice(0, 6).map((e, i) => (
          <li key={i} className="flex justify-between gap-3 border-b border-line/60 py-1 last:border-0">
            <span className="truncate font-medium">{e.name}</span>
            <span className="truncate text-muted">{e.path}</span>
          </li>
        ))}
        {live.recent.length === 0 && <li className="text-muted">No activity right now.</li>}
      </ul>
    </div>
  );
}
