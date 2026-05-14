import { db } from './db';
import { auditLog } from './db/schema';
import { logger, hashPII } from './logger';

/**
 * Append-only audit logger. Writes both to the DB (append-only by application
 * convention; we never expose UPDATE/DELETE routes for this table) and to the
 * structured logs for grep-on-disk.
 *
 * Payload is sanitized: known PII fields are replaced with SHA-256 hashes.
 */

const PII_KEYS = new Set([
  'email',
  'firstName',
  'lastName',
  'first_name',
  'last_name',
  'name',
  'telephone',
  'phone',
  'token',
  'password',
  'apiKey',
  'authorization',
  'secret',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = PII_KEYS.has(k) ? hashPII(v) : sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type AuditActor =
  | { type: 'student'; id: number }
  | { type: 'agent'; id: number }
  | { type: 'system'; id?: number }
  | { type: 'ai'; id?: number };

export interface AuditOptions {
  actor: AuditActor;
  action: string;
  resourceType?: string;
  resourceId?: string | number;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function audit(opts: AuditOptions): Promise<void> {
  const sanitized = opts.payload ? (sanitize(opts.payload) as Record<string, unknown>) : null;
  const row = {
    actorType: opts.actor.type,
    actorId: opts.actor.id ?? null,
    action: opts.action,
    resourceType: opts.resourceType ?? null,
    resourceId: opts.resourceId != null ? String(opts.resourceId) : null,
    payload: sanitized,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent ?? null,
  };
  try {
    await db.insert(auditLog).values(row);
  } catch (err) {
    // Never let audit failures block the user — but make them very loud in logs.
    logger.error({ err, action: opts.action }, 'audit-log write failed');
  }
  logger.info({ audit: row }, `audit:${opts.action}`);
}

export const auditActions = {
  LOGIN_REQUEST: 'LOGIN_REQUEST',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_DESTROYED: 'SESSION_DESTROYED',
  IDOR_ATTEMPT: 'IDOR_ATTEMPT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  REAUTH_SUCCESS: 'REAUTH_SUCCESS',
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_REPLY: 'TICKET_REPLY',
  TICKET_STATUS_CHANGED: 'TICKET_STATUS_CHANGED',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TICKET_CLOSED: 'TICKET_CLOSED',
  KB_ARTICLE_CREATED: 'KB_ARTICLE_CREATED',
  KB_ARTICLE_EDITED: 'KB_ARTICLE_EDITED',
  KB_ARTICLE_DELETED: 'KB_ARTICLE_DELETED',
  KB_ARTICLE_VIEWED: 'KB_ARTICLE_VIEWED',
  AGENT_VIEWED_STUDENT: 'AGENT_VIEWED_STUDENT',
  STUDENT_DATA_EXPORTED: 'STUDENT_DATA_EXPORTED',
  STUDENT_DATA_DELETED: 'STUDENT_DATA_DELETED',
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
} as const;

export type AuditAction = (typeof auditActions)[keyof typeof auditActions];
export const toolCallAction = (tool: string) => `TOOL_CALL_${tool}`;
