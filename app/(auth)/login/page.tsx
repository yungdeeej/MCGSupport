import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Sign in · MCG Support' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; sent?: string } }) {
  return (
    <div className="container-page max-w-md py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tightish">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the email MCG has on file. We&apos;ll send a one-time sign-in link.
        </p>
        {searchParams.sent === '1' ? (
          <div className="mt-6 rounded-xl bg-success/10 p-4 text-sm text-foreground">
            <p className="font-medium">Check your email.</p>
            <p className="mt-1 text-muted-foreground">
              If that email matches a student record, you&apos;ll receive a sign-in link within a
              minute. It expires in 15 minutes and works once.
            </p>
          </div>
        ) : (
          <LoginForm next={searchParams.next ?? '/'} />
        )}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Need help signing in?{' '}
        <a href="/kb/cant-sign-in" className="underline">
          Read the guide
        </a>{' '}
        or email <a className="underline" href="mailto:support@mcgcollege.com">support@mcgcollege.com</a>.
      </p>
    </div>
  );
}
