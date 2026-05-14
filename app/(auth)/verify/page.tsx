import { redirect } from 'next/navigation';
import { verifyMagicLink, InvalidTokenError } from '@/lib/auth/magicLink';
import { createSession, markReauthed } from '@/lib/auth/session';
import { audit, auditActions } from '@/lib/audit';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({ searchParams }: { searchParams: { token?: string; next?: string } }) {
  const token = searchParams.token;
  if (!token) {
    return (
      <ErrorView
        title="Invalid link"
        message="This sign-in link is missing its token. Request a new one."
      />
    );
  }
  let user;
  try {
    user = await verifyMagicLink(token);
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return (
        <ErrorView
          title="Link expired or already used"
          message="Sign-in links expire after 15 minutes and only work once. Request a new one."
        />
      );
    }
    throw err;
  }

  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
  const ua = h.get('user-agent') ?? undefined;

  const session = await createSession({
    userId: user.userId,
    userType: user.userType,
    ip,
    userAgent: ua,
  });

  if (user.purpose === 'reauth') {
    await markReauthed(session.id);
  }

  await audit({
    actor: { type: user.userType, id: user.userId },
    action: auditActions.LOGIN_SUCCESS,
    payload: { purpose: user.purpose, userType: user.userType },
    ip,
    userAgent: ua,
  });

  const dest = user.userType === 'agent' ? '/admin/inbox' : (searchParams.next ?? '/');
  redirect(dest);
}

function ErrorView({ title, message }: { title: string; message: string }) {
  return (
    <div className="container-page max-w-md py-16">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <a
          href="/login"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-brand-600"
        >
          Request a new link
        </a>
      </div>
    </div>
  );
}
