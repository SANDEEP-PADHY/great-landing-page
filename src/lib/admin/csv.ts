// CSV helpers. Free-text cells are neutralised against spreadsheet formula injection.
export function csvCell(v: unknown, opts: { text?: boolean } = {}): string {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (opts.text && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function csvLine(cells: string[]): string {
  return cells.join(',') + '\r\n';
}
export function csvResponse(filename: string, body: ReadableStream<Uint8Array>): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
/** Stream rows produced in batches; `next(offset)` returns an empty array when done. */
export function csvStream<T>(header: string[], next: (offset: number) => Promise<T[]>, toLine: (row: T) => string[], batch = 500) {
  const enc = new TextEncoder();
  let offset = 0;
  let sentHeader = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!sentHeader) {
        sentHeader = true;
        controller.enqueue(enc.encode('\uFEFF' + csvLine(header)));
        return;
      }
      const rows = await next(offset);
      if (rows.length === 0) return controller.close();
      offset += rows.length;
      controller.enqueue(enc.encode(rows.map((r) => csvLine(toLine(r))).join('')));
      if (rows.length < batch) controller.close();
    },
  });
}
