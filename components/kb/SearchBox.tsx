'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBox({ defaultValue = '' }: { defaultValue?: string }) {
  const [q, setQ] = useState(defaultValue);
  const router = useRouter();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/kb?q=${encodeURIComponent(q.trim())}`);
      }}
      className="relative mx-auto max-w-2xl"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        aria-label="Search the MCG knowledge base"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search or ask anything…"
        className="h-14 w-full rounded-2xl border border-input bg-background pl-12 pr-32 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-brand-600"
      >
        Search
      </button>
    </form>
  );
}
