// No 0/O, 1/l/I so passwords survive being read aloud or retyped.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 16): string {
  if (length < 12) {
    throw new Error('Temporary password length must be at least 12 characters');
  }

  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
