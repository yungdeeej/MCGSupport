'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
          const res = await fetch('/api/auth/request-link', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, next }),
          });
          if (res.status === 429) {
            setError('Too many attempts. Wait a minute and try again.');
            return;
          }
          if (!res.ok) {
            setError('Something went wrong. Please try again.');
            return;
          }
          window.location.href = `/login?sent=1`;
        } catch {
          setError('Network error. Please try again.');
        } finally {
          setLoading(false);
        }
      }}
      className="mt-6 space-y-4"
      aria-describedby={error ? 'login-error' : undefined}
    >
      <div className="space-y-2">
        <Label htmlFor="email">School email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@mcgcollege.com"
          aria-invalid={!!error}
        />
      </div>
      {error && (
        <p id="login-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading || !email} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send me a sign-in link'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        We&apos;ll never share your email. By signing in you agree to our{' '}
        <a href="/legal/terms" className="underline">Terms</a> and{' '}
        <a href="/legal/privacy" className="underline">Privacy</a>.
      </p>
    </form>
  );
}
