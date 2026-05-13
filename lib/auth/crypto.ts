import crypto from 'node:crypto';
import { env } from '../env';

/** Constant-time SHA-256 hash (hex) — used to store magic-link tokens. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Random opaque token, URL-safe base64. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Constant-time equality on hex strings. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/* ---------- AES-256-GCM for TOTP secrets ---------- */

function key(): Buffer {
  const raw = env.ENCRYPTION_KEY;
  // Accept base64 or raw text; pad/hash to 32 bytes.
  const h = crypto.createHash('sha256').update(raw).digest();
  return h;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const dec = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  dec.setAuthTag(tag);
  const out = Buffer.concat([dec.update(enc), dec.final()]);
  return out.toString('utf8');
}
