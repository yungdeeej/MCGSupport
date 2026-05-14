import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-32-byte-key-only-for-unit-tests';
  process.env.SESSION_SECRET = 'test-session-secret-only-for-unit-tests';
});

describe('crypto helpers', () => {
  it('round-trips encrypt/decrypt', async () => {
    const { encrypt, decrypt } = await import('@/lib/auth/crypto');
    const plain = 'TOTP_SECRET_ABCDEF1234567890';
    const enc = encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(decrypt(enc)).toBe(plain);
  });

  it('hashes deterministically and not reversibly', async () => {
    const { sha256 } = await import('@/lib/auth/crypto');
    const a = sha256('foo');
    const b = sha256('foo');
    expect(a).toBe(b);
    expect(a).not.toBe(sha256('bar'));
    expect(a.length).toBe(64);
  });

  it('generates random tokens of expected entropy', async () => {
    const { randomToken } = await import('@/lib/auth/crypto');
    const t1 = randomToken();
    const t2 = randomToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThan(30);
  });
});
