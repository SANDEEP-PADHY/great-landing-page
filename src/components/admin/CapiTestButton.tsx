'use client';
import { useState } from 'react';
import { btnPrimary } from './ui';

export function CapiTestButton() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; fbtraceId?: string; error?: string } | null>(null);
  return (
    <div>
      <button type="button" className={btnPrimary} disabled={busy} onClick={async () => {
        setBusy(true); setRes(null);
        try {
          const r = await fetch('/api/admin/capi-test', { method: 'POST' });
          setRes((await r.json()) as { ok: boolean; fbtraceId?: string; error?: string });
        } catch { setRes({ ok: false, error: 'Network error' }); } finally { setBusy(false); }
      }}>{busy ? 'Sending…' : 'Send test PageView'}</button>
      {res && (
        <p role="status" className={`mt-2 text-sm font-medium ${res.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {res.ok ? `Sent. fbtrace_id ${res.fbtraceId ?? 'n/a'}. Check Events Manager → Test events.` : `Failed: ${res.error ?? 'unknown error'}`}
        </p>
      )}
    </div>
  );
}
