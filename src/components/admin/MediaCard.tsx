'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { btn, btnDanger, btnPrimary, input, label } from './ui';

type Props = {
  mediaKey: string; title: string; hint: string; kind: 'image' | 'file'; accept: string;
  current: { src: string | null; alt: string; bytes: number | null; name: string | null; updatedAt: string | null } | null;
};

export function MediaCard({ mediaKey, title, hint, kind, accept, current }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(current?.alt ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const url = `/api/admin/media/${mediaKey}`;

  async function call(kindOfCall: 'upload' | 'remove' | 'alt', init: RequestInit) {
    setBusy(kindOfCall); setMsg(null);
    try {
      const res = await fetch(url, init);
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Request failed');
      setMsg({ ok: true, text: kindOfCall === 'upload' ? 'Uploaded. The site refreshes within seconds.' : kindOfCall === 'remove' ? 'Removed.' : 'Alt text saved.' });
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally { setBusy(null); }
  }

  function upload() {
    const f = fileRef.current?.files?.[0];
    if (!f) return setMsg({ ok: false, text: 'Choose a file first.' });
    const fd = new FormData();
    fd.set('file', f);
    if (kind === 'image') fd.set('alt', alt);
    void call('upload', { method: 'POST', body: fd });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {kind === 'image' ? (
        <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-slate-50">
          {current?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${current.src}?v=${encodeURIComponent(current.updatedAt ?? '')}`} alt={current.alt || title} className="max-h-full max-w-full object-contain" />
          ) : <span className="px-3 text-center text-xs text-muted">Using the built-in placeholder</span>}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-slate-50 px-3 py-4 text-sm">
          {current ? <><div className="font-medium">{current.name}</div><div className="text-xs text-muted">{((current.bytes ?? 0) / 1024 / 1024).toFixed(2)} MB</div></> : <span className="text-muted">No file uploaded yet. The thank-you page hides the download until one exists.</span>}
        </div>
      )}
      {kind === 'image' && (
        <div>
          <span className={label}>Alt text</span>
          <div className="flex gap-2">
            <input className={input} value={alt} maxLength={160} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" />
            {current && <button type="button" className={btn} disabled={busy !== null} onClick={() => void call('alt', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alt }) })}>Save</button>}
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept={accept} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnPrimary} disabled={busy !== null} onClick={upload}>{busy === 'upload' ? 'Uploading…' : current ? 'Replace' : 'Upload'}</button>
        {current && <button type="button" className={btnDanger} disabled={busy !== null} onClick={() => void call('remove', { method: 'DELETE' })}>{busy === 'remove' ? 'Removing…' : 'Remove'}</button>}
      </div>
      {msg && <p role="status" className={`text-sm font-medium ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>}
    </div>
  );
}
