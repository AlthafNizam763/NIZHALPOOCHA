import { randomBytes, randomInt, randomUUID } from 'node:crypto';

// No 0/O/1/I to keep codes readable when shared aloud.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function roomCode(length = 6): string {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

export function uid(prefix = ''): string {
  return prefix + randomUUID().replace(/-/g, '').slice(0, 16);
}

export function shortId(): string {
  return randomBytes(6).toString('base64url');
}

/** Cryptographically random Fisher–Yates shuffle (role assignment must be unpredictable). */
export function secureShuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}
