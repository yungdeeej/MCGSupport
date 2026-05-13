import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
  auditActions: { IDOR_ATTEMPT: 'IDOR_ATTEMPT', AGENT_VIEWED_STUDENT: 'AGENT_VIEWED_STUDENT' },
  toolCallAction: (n: string) => `TOOL_CALL_${n}`,
}));

import { requireStudentAccess, requireAdmin, requireAgent } from '@/lib/auth/requireOwnership';
import { ForbiddenError, UnauthorizedError, type SessionData } from '@/lib/auth/session';

describe('ownership enforcement', () => {
  beforeEach(() => vi.clearAllMocks());

  const studentSession: SessionData = {
    id: 's1',
    userId: 42,
    userType: 'student',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  };
  const agentSession: SessionData = {
    id: 'a1',
    userId: 1,
    userType: 'agent',
    role: 'agent',
    campusIds: [1],
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  };
  const adminSession: SessionData = { ...agentSession, role: 'admin' };

  it('rejects when there is no session', async () => {
    await expect(requireStudentAccess(null, 1)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects students reading other students (IDOR)', async () => {
    await expect(requireStudentAccess(studentSession, 99)).rejects.toBeInstanceOf(ForbiddenError);
    const { audit } = await import('@/lib/audit');
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'IDOR_ATTEMPT' }),
    );
  });

  it('allows students reading their own record', async () => {
    await expect(requireStudentAccess(studentSession, 42)).resolves.toBe(studentSession);
  });

  it('allows agents to read any student and records a view', async () => {
    await expect(requireStudentAccess(agentSession, 9999)).resolves.toBe(agentSession);
    const { audit } = await import('@/lib/audit');
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AGENT_VIEWED_STUDENT' }),
    );
  });

  it('requireAgent / requireAdmin gate by role', () => {
    expect(() => requireAgent(studentSession)).toThrow(ForbiddenError);
    expect(() => requireAdmin(agentSession)).toThrow(ForbiddenError);
    expect(requireAdmin(adminSession)).toBe(adminSession);
  });
});
