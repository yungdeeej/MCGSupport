import { audit, auditActions } from '../audit';
import {
  ForbiddenError,
  UnauthorizedError,
  ReauthRequiredError,
  isReauthValid,
  type SessionData,
} from './session';

/**
 * Every API route that handles student-scoped data must call one of these.
 *
 * The pattern:
 *   1. Pull the session.
 *   2. Resolve the *target* student ID from the request (URL param or body).
 *   3. Call requireStudentAccess(session, target).
 *
 * For tool handlers in the AI runtime, the studentId is *injected from the
 * session itself* — never accepted as a tool parameter. See lib/ai/tools/*.
 */
export function requireSession(session: SessionData | null): SessionData {
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function requireStudentAccess(
  session: SessionData | null,
  targetStudentId: number,
  ctx: { ip?: string; route?: string } = {},
): Promise<SessionData> {
  const s = requireSession(session);
  if (s.userType === 'agent') {
    await audit({
      actor: { type: 'agent', id: s.userId },
      action: auditActions.AGENT_VIEWED_STUDENT,
      resourceType: 'student',
      resourceId: targetStudentId,
      payload: { route: ctx.route },
      ip: ctx.ip,
    });
    return s;
  }
  if (s.userId !== targetStudentId) {
    await audit({
      actor: { type: 'student', id: s.userId },
      action: auditActions.IDOR_ATTEMPT,
      resourceType: 'student',
      resourceId: targetStudentId,
      payload: { route: ctx.route },
      ip: ctx.ip,
    });
    throw new ForbiddenError();
  }
  return s;
}

export function requireAgent(session: SessionData | null): SessionData {
  const s = requireSession(session);
  if (s.userType !== 'agent') throw new ForbiddenError();
  return s;
}

export function requireAdmin(session: SessionData | null): SessionData {
  const s = requireAgent(session);
  if (s.role !== 'admin') throw new ForbiddenError();
  return s;
}

/** For sensitive actions — require a recent re-auth (Section 5.2 step 6). */
export function requireReauth(session: SessionData): void {
  if (!isReauthValid(session)) throw new ReauthRequiredError('reauth required');
}
