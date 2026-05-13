import { cookies } from 'next/headers';
import { db } from '../db';
import { sessions, agents, students } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { randomToken } from './crypto';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'mcg_session';
const SESSION_DAYS = 7;
const REAUTH_TTL_MIN = 10;

export interface SessionData {
  id: string;
  userId: number;
  userType: 'student' | 'agent';
  /** present only on agent sessions */
  role?: 'agent' | 'admin';
  campusIds?: number[];
  /** epoch ms of last re-auth (null if never re-auth'd this session) */
  reauthedAt?: number;
  expiresAt: Date;
}

/**
 * Create a fresh server-side session row and set the cookie. Cookie value is
 * an opaque random token; nothing is encoded inside it. Lookups always go
 * through the DB so an admin can yank an active session at will.
 */
export async function createSession(args: {
  userId: number;
  userType: 'student' | 'agent';
  ip?: string;
  userAgent?: string;
}): Promise<SessionData> {
  const id = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id,
    userId: args.userId,
    userType: args.userType,
    ip: args.ip ?? null,
    userAgent: args.userAgent ?? null,
    expiresAt,
  });
  cookies().set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
  return { id, userId: args.userId, userType: args.userType, expiresAt };
}

export async function destroySession(): Promise<void> {
  const c = cookies().get(SESSION_COOKIE)?.value;
  if (c) {
    await db.delete(sessions).where(eq(sessions.id, c));
  }
  cookies().delete(SESSION_COOKIE);
}

/**
 * Resolve the current session from the cookie. Returns null if missing,
 * expired, or revoked. Touches `last_active_at` lazily.
 */
export async function getSession(req?: NextRequest): Promise<SessionData | null> {
  const token = req
    ? req.cookies.get(SESSION_COOKIE)?.value
    : cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;

  let role: 'agent' | 'admin' | undefined;
  let campusIds: number[] | undefined;
  if (row.userType === 'agent') {
    const [a] = await db
      .select({ role: agents.role, campusIds: agents.campusIds, active: agents.active })
      .from(agents)
      .where(eq(agents.id, row.userId))
      .limit(1);
    if (!a || !a.active) return null;
    role = a.role;
    campusIds = a.campusIds;
  } else {
    // Belt-and-braces: ensure the student still exists and is active.
    const [s] = await db
      .select({ status: students.status })
      .from(students)
      .where(eq(students.id, row.userId))
      .limit(1);
    if (!s) return null;
  }

  // Touch last_active_at every few minutes only.
  if (row.lastActiveAt.getTime() < Date.now() - 5 * 60 * 1000) {
    await db
      .update(sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(sessions.id, row.id));
  }

  return {
    id: row.id,
    userId: row.userId,
    userType: row.userType,
    role,
    campusIds,
    reauthedAt: row.reauthedAt ? row.reauthedAt.getTime() : undefined,
    expiresAt: row.expiresAt,
  };
}

/** Mark the current session as re-authenticated for sensitive actions. */
export async function markReauthed(sessionId: string): Promise<void> {
  await db.update(sessions).set({ reauthedAt: new Date() }).where(eq(sessions.id, sessionId));
}

export function isReauthValid(session: SessionData): boolean {
  if (!session.reauthedAt) return false;
  return Date.now() - session.reauthedAt < REAUTH_TTL_MIN * 60 * 1000;
}

export class UnauthorizedError extends Error {
  status = 401;
}
export class ForbiddenError extends Error {
  status = 403;
}
export class ReauthRequiredError extends Error {
  status = 403;
  code = 'REAUTH_REQUIRED';
}
