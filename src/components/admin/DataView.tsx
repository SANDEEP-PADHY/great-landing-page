// Renders whatever shape a WS4 analytics query returns (array of rows, object, or scalar). [WS3]
import { Empty, TableBox, td, th } from './ui';

const humanise = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function cell(k: string, v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    if (/paise/i.test(k)) return `₹${(v / 100).toLocaleString('en-IN')}`;
    return Number.isInteger(v) ? v.toLocaleString('en-IN') : String(Math.round(v * 100) / 100);
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function DataView({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="py-4 text-center text-sm text-muted">No data in this range.</p>;
    const rows = data as Record<string, unknown>[];
    if (typeof rows[0] !== 'object' || rows[0] === null) return <p className="text-sm">{rows.map(String).join(', ')}</p>;
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    return (
      <div className="-m-4"><TableBox>
        <table className="w-full">
          <thead><tr>{cols.map((c) => <th key={c} className={th}>{humanise(c)}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} className={td}>{cell(c, r[c])}</td>)}</tr>)}</tbody>
        </table>
      </TableBox></div>
    );
  }
  if (data && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <p className="py-4 text-center text-sm text-muted">No data.</p>;
    return (
      <dl className="grid gap-x-6 sm:grid-cols-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-1.5 text-sm">
            <dt className="text-muted">{humanise(k)}</dt>
            <dd className="min-w-0 break-words text-right font-medium">{Array.isArray(v) || (v && typeof v === 'object') ? <code className="text-xs">{JSON.stringify(v)}</code> : cell(k, v)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (data === null || data === undefined) return <Empty>No data.</Empty>;
  return <p className="text-2xl font-bold">{String(data)}</p>;
}
