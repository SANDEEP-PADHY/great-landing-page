'use client';
// WS1 STUB: WS4 replaces this file.
import type { EventName } from './taxonomy';

export function track(_name: EventName, _props?: Record<string, unknown>, opts?: { eventId?: string }): string {
  return opts?.eventId ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now()));
}
export function setPixelUserData(_d: { email: string; phone: string; name: string }): void {}
