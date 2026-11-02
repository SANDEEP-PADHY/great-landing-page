import 'server-only';
// WS1 STUB: WS4 replaces this file.
export function registerCapiJob(_register: (name: string, everyMs: number, fn: () => Promise<void>) => void): void {}
export async function sendCapiTestEvent(): Promise<{ ok: boolean; fbtraceId?: string; error?: string }> {
  return { ok: false, error: 'not implemented' };
}
