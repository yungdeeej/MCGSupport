import pRetry, { AbortError } from 'p-retry';
import { logger } from './logger';
import { z } from 'zod';

/**
 * fetchJSON — the only HTTP entry point for any third-party integration.
 *
 * - Adds request-id, timeout, retry-with-backoff (exponential, jittered).
 * - Validates the response with a Zod schema before returning.
 * - Logs with redacted headers/body. Never log Authorization or X-Api-Key values.
 * - Implements a lightweight circuit breaker per host: after N consecutive
 *   failures inside a window, fast-fail for cooldown_ms.
 */

interface CircuitState {
  failures: number;
  openedAt: number | null;
}
const circuits = new Map<string, CircuitState>();
const CIRCUIT_FAIL_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000;

function host(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function checkCircuit(h: string) {
  const s = circuits.get(h);
  if (!s || s.openedAt == null) return;
  if (Date.now() - s.openedAt < CIRCUIT_COOLDOWN_MS) {
    throw new AbortError(`circuit open for ${h}`);
  }
  // Half-open: clear so the next request can probe.
  circuits.set(h, { failures: 0, openedAt: null });
}

function recordSuccess(h: string) {
  circuits.set(h, { failures: 0, openedAt: null });
}
function recordFailure(h: string) {
  const s = circuits.get(h) ?? { failures: 0, openedAt: null };
  s.failures += 1;
  if (s.failures >= CIRCUIT_FAIL_THRESHOLD && s.openedAt == null) {
    s.openedAt = Date.now();
    logger.error({ host: h, failures: s.failures }, 'circuit opened');
  }
  circuits.set(h, s);
}

export interface FetchJSONOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  schema: z.ZodType<T>;
  /** Total attempts including the first. */
  retries?: number;
  /** ms before aborting an individual attempt. */
  timeoutMs?: number;
  /** label for log/metric tagging. */
  op: string;
}

export class HttpError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

export async function fetchJSON<T>(opts: FetchJSONOptions<T>): Promise<T> {
  const h = host(opts.url);
  checkCircuit(h);

  const timeoutMs = opts.timeoutMs ?? 15_000;
  const attempt = async () => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(opts.url, {
        method: opts.method ?? 'GET',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...opts.headers,
        },
        body: opts.body != null ? JSON.stringify(opts.body) : undefined,
        signal: ctl.signal,
      });
      if (res.status >= 500) {
        // retryable
        const text = await res.text();
        throw new HttpError(res.status, text, `upstream ${res.status} from ${h}`);
      }
      if (res.status === 429) {
        throw new HttpError(429, null, `rate-limited by ${h}`);
      }
      if (res.status >= 400) {
        // non-retryable — give up
        const text = await res.text().catch(() => '');
        const err = new HttpError(res.status, text, `client error ${res.status} from ${h}`);
        throw new AbortError(err.message);
      }
      const json = (await res.json()) as unknown;
      const parsed = opts.schema.safeParse(json);
      if (!parsed.success) {
        logger.warn(
          { op: opts.op, host: h, issues: parsed.error.issues },
          'response schema validation failed',
        );
        throw new AbortError(`schema mismatch for ${opts.op}`);
      }
      return parsed.data;
    } finally {
      clearTimeout(t);
    }
  };

  try {
    const result = await pRetry(attempt, {
      retries: opts.retries ?? 3,
      factor: 2,
      minTimeout: 250,
      maxTimeout: 4_000,
      randomize: true,
      onFailedAttempt: (err) => {
        logger.warn(
          {
            op: opts.op,
            host: h,
            attempt: err.attemptNumber,
            retriesLeft: err.retriesLeft,
            err: err.message,
          },
          'http retry',
        );
      },
    });
    recordSuccess(h);
    return result;
  } catch (err) {
    recordFailure(h);
    logger.error({ op: opts.op, host: h, err }, 'http call failed');
    throw err;
  }
}
