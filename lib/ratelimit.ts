import { db } from './db';
import { rateLimitBuckets } from './db/schema';
import { sql } from 'drizzle-orm';
import { audit, auditActions } from './audit';

/**
 * Token-bucket rate limiter backed by Postgres.
 *
 * This is intentionally simple and avoids Redis. For our expected volumes
 * (low-thousands of users) a single Postgres row per key with a SELECT FOR
 * UPDATE is fine. If we outgrow it we drop in upstash.
 */
export interface Limit {
  /** bucket capacity (max tokens). */
  capacity: number;
  /** refill rate in tokens per second. */
  refillPerSec: number;
}

export const limits = {
  /** Magic-link request per email — 5/hour. */
  magicLinkPerEmail: { capacity: 5, refillPerSec: 5 / 3600 },
  /** Magic-link request per IP — 20/hour. */
  magicLinkPerIp: { capacity: 20, refillPerSec: 20 / 3600 },
  /** Generic login attempts per IP — 10/min. */
  loginPerIp: { capacity: 10, refillPerSec: 10 / 60 },
  /** AI chat per student — 60 turns/hour. Protects cost. */
  aiChatPerStudent: { capacity: 60, refillPerSec: 60 / 3600 },
  /** AI chat per IP — 120 turns/hour. */
  aiChatPerIp: { capacity: 120, refillPerSec: 120 / 3600 },
  /** Search per IP — 60/min. */
  searchPerIp: { capacity: 60, refillPerSec: 1 },
} as const satisfies Record<string, Limit>;

export type LimitName = keyof typeof limits;

export async function rateLimit(name: LimitName, key: string): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}> {
  const cfg = limits[name];
  const bucketKey = `${name}:${key}`;
  const now = new Date();

  // Upsert: fetch or create with full bucket. Use SELECT FOR UPDATE so two
  // concurrent requests do not double-spend tokens.
  const result = await db.transaction(async (tx) => {
    const rows = await tx.execute(sql`
      SELECT tokens, last_refill FROM rate_limit_buckets
      WHERE key = ${bucketKey} FOR UPDATE
    `);
    let tokens = cfg.capacity;
    let lastRefill = now;
    const row = rows.rows[0] as { tokens: number; last_refill: string } | undefined;
    if (row) {
      lastRefill = new Date(row.last_refill);
      const elapsed = (now.getTime() - lastRefill.getTime()) / 1000;
      tokens = Math.min(cfg.capacity, Number(row.tokens) + elapsed * cfg.refillPerSec);
    }
    const allowed = tokens >= 1;
    const next = allowed ? tokens - 1 : tokens;
    await tx.execute(sql`
      INSERT INTO rate_limit_buckets (key, tokens, last_refill)
      VALUES (${bucketKey}, ${next}, ${now.toISOString()})
      ON CONFLICT (key) DO UPDATE SET tokens = ${next}, last_refill = ${now.toISOString()}
    `);
    const retryAfterMs = allowed
      ? 0
      : Math.ceil(((1 - next) / cfg.refillPerSec) * 1000);
    return { allowed, remaining: Math.floor(next), retryAfterMs };
  });

  if (!result.allowed) {
    await audit({
      actor: { type: 'system' },
      action: auditActions.RATE_LIMIT_HIT,
      payload: { limit: name, keyHashed: true },
    });
  }
  return result;
}
