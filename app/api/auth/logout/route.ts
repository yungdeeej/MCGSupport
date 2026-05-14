import { NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/auth/session';
import { audit, auditActions } from '@/lib/audit';

export async function POST() {
  const s = await getSession();
  await destroySession();
  if (s) {
    await audit({
      actor: { type: s.userType, id: s.userId },
      action: auditActions.SESSION_DESTROYED,
    });
  }
  return NextResponse.redirect(new URL('/', process.env.APP_URL ?? 'http://localhost:3000'), {
    status: 303,
  });
}
