import { ReauthForm } from '@/components/auth/ReauthForm';

export const metadata = { title: 'Re-verify · MCG Support' };

export default function ReauthPage() {
  return (
    <div className="container-page max-w-md py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Confirm it&apos;s you</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Some actions — like viewing grades — require a fresh check. We&apos;ll email a one-time link.
        </p>
        <ReauthForm />
      </div>
    </div>
  );
}
