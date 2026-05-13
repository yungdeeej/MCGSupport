import pino, { type LoggerOptions } from 'pino';
import crypto from 'node:crypto';

/**
 * Hash a PII value for greppable logs without revealing the source.
 * We use a truncated SHA-256 so the log is short but collisions are still
 * astronomically unlikely within a single deployment.
 */
export function hashPII(value: unknown): string {
  if (value == null) return '<null>';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return 'sha256:' + crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

const REDACT_PATHS = [
  'email',
  'firstName',
  'lastName',
  'first_name',
  'last_name',
  'telephone',
  'phone',
  'password',
  'token',
  'authToken',
  'apiKey',
  'authorization',
  'secret',
  '*.email',
  '*.firstName',
  '*.lastName',
  '*.telephone',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.authorization',
  '*.secret',
  'headers.authorization',
  'headers["x-api-key"]',
  'headers["x-api-token"]',
  'req.headers.authorization',
  'req.headers["x-api-key"]',
];

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  base: { service: 'mcg-support' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
};

export const logger = pino(options);

/** Create a child logger bound to a request ID. */
export function requestLogger(reqId: string, extras: Record<string, unknown> = {}) {
  return logger.child({ reqId, ...extras });
}
