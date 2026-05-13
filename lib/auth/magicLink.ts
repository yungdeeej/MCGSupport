import { db } from '../db';
import { authTokens, students, agents } from '../db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { randomToken, sha256 } from './crypto';
import { sendEmail, renderMagicLinkEmail } from '../email';
import { audit, auditActions } from '../audit';
import { env } from '../env';
import { logger } from '../logger';

const MAGIC_LINK_TTL_MIN = 15;

/**
 * Look up a student or agent by email. Returns the row or null without
 * leaking the difference to callers — `requestLogin` always responds with the
 * same generic message.
 */
async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const [s] = await db
    .select({ id: students.id, firstName: students.firstName, status: students.status })
    .from(students)
    .where(eq(students.email, normalized))
    .limit(1);
  if (s && s.status === 'active') {
    return { type: 'student' as const, id: s.id, name: s.firstName, email: normalized };
  }
  const [a] = await db
    .select({ id: agents.id, name: agents.name, active: agents.active })
    .from(agents)
    .where(eq(agents.email, normalized))
    .limit(1);
  if (a && a.active) {
    return { type: 'agent' as const, id: a.id, name: a.name, email: normalized };
  }
  return null;
}

/**
 * Request a magic link. Always returns success-shaped data — never leaks
 * whether the email is on file (Section 5.2).
 */
export async function requestMagicLink(args: {
  email: string;
  purpose?: 'login' | 'reauth';
  ip?: string;
}): Promise<{ ok: true }> {
  const purpose = args.purpose ?? 'login';
  const user = await findUserByEmail(args.email);

  if (!user) {
    // Still write an audit row so brute-force shows up.
    await audit({
      actor: { type: 'system' },
      action: auditActions.LOGIN_REQUEST,
      payload: { unknownEmail: true },
      ip: args.ip,
    });
    return { ok: true };
  }

  const token = randomToken(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MIN * 60 * 1000);

  await db.insert(authTokens).values({
    email: user.email,
    tokenHash,
    purpose,
    userType: user.type,
    expiresAt,
    ip: args.ip ?? null,
  });

  const url = `${env.APP_URL || 'http://localhost:3000'}/verify?token=${encodeURIComponent(token)}`;
  const { text, html } = renderMagicLinkEmail({
    name: user.name,
    url,
    expiresMin: MAGIC_LINK_TTL_MIN,
  });

  await sendEmail({
    to: user.email,
    subject:
      purpose === 'reauth'
        ? 'Confirm it’s you · MCG Support'
        : 'Sign in to MCG Student Support',
    text,
    html,
    tag: purpose === 'reauth' ? 'reauth-link' : 'magic-link',
  });

  await audit({
    actor: { type: user.type, id: user.id },
    action: auditActions.LOGIN_REQUEST,
    payload: { purpose, userType: user.type },
    ip: args.ip,
  });

  if (env.DEV_LOG_MAGIC_LINKS) {
    logger.info({ url }, 'DEV magic link (do not enable in prod)');
  }

  return { ok: true };
}

/**
 * Validate a token. Returns the user descriptor on success, throws otherwise.
 * Tokens are single-use; this call marks them consumed atomically.
 */
export async function verifyMagicLink(token: string): Promise<{
  userType: 'student' | 'agent';
  userId: number;
  email: string;
  purpose: 'login' | 'reauth';
}> {
  const tokenHash = sha256(token);
  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash),
        gt(authTokens.expiresAt, new Date()),
        isNull(authTokens.usedAt),
      ),
    )
    .limit(1);
  if (!row) {
    throw new InvalidTokenError('invalid or expired token');
  }

  // Mark used (single-use enforcement).
  const updated = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, row.id), isNull(authTokens.usedAt)))
    .returning({ id: authTokens.id });
  if (updated.length === 0) {
    throw new InvalidTokenError('token already used');
  }

  // Look up the user by email + user_type.
  const email = row.email;
  if (row.userType === 'student') {
    const [s] = await db
      .select({ id: students.id, status: students.status })
      .from(students)
      .where(eq(students.email, email))
      .limit(1);
    if (!s || s.status !== 'active') throw new InvalidTokenError('inactive user');
    return { userType: 'student', userId: s.id, email, purpose: row.purpose };
  } else {
    const [a] = await db
      .select({ id: agents.id, active: agents.active })
      .from(agents)
      .where(eq(agents.email, email))
      .limit(1);
    if (!a || !a.active) throw new InvalidTokenError('inactive user');
    return { userType: 'agent', userId: a.id, email, purpose: row.purpose };
  }
}

export class InvalidTokenError extends Error {
  status = 400;
}
