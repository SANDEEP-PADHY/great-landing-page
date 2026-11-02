import { createHash } from 'node:crypto';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const hashEmail = (e: string) => sha256(e.trim().toLowerCase());

/** Digits only, India country code 91 prepended for 10-digit numbers. */
export function hashPhone(p: string): string {
  let d = p.replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  return sha256(d);
}

export const hashName = (n: string) => sha256(n.trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? '', last: parts.length > 1 ? parts[parts.length - 1]! : '' };
}

export const hashExternalId = (id: string) => sha256(id);
