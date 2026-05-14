'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);
  return (
    <div className="container-page max-w-md py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tightish">Something broke.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We hit an unexpected error. Try again — if it keeps happening,{' '}
        <a className="underline" href="/tickets/new">open a ticket</a> and our team will dig in.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <a href="/">Home</a>
        </Button>
      </div>
    </div>
  );
}
