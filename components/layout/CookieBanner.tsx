'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const accepted = document.cookie.includes('mcg_cookies=1');
    setShow(!accepted);
  }, []);
  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border border-border bg-background p-4 shadow-lg sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p id="cookie-title" className="text-sm font-medium">
            We use essential cookies only.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Session cookies keep you signed in. We do not run third-party analytics on this
            portal. See our{' '}
            <Link href="/legal/privacy" className="underline">
              privacy notice
            </Link>
            .
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            document.cookie = `mcg_cookies=1; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
            setShow(false);
          }}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
