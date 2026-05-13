'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export function ReauthForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  if (sent) {
    return (
      <p className="mt-6 rounded-xl bg-success/10 p-4 text-sm">
        Check your email for the re-verify link. It expires in 15 minutes.
      </p>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        await fetch('/api/auth/request-link', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, purpose: 'reauth' }),
        });
        setSent(true);
        setLoading(false);
      }}
      className="mt-6 space-y-3"
    >
      <Label htmlFor="email">Confirm your school email</Label>
      <Input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" disabled={loading || !email}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send re-verify link'}
      </Button>
    </form>
  );
}
