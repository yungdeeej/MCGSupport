'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

/**
 * AI-suggested reply panel. Calls /api/admin/suggest-reply on demand;
 * agent reviews and clicks "Use this draft" which pre-fills the reply form
 * via a custom event the form listens to (`mcg:suggested-reply`).
 */
export function SuggestedReply({ ticketId }: { ticketId: number }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/suggest-reply`, {
        method: 'POST',
      });
      if (!res.ok) {
        setError('Could not generate suggestion');
        return;
      }
      const j = await res.json();
      setText(j.draft ?? '');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function insert() {
    if (!text) return;
    const ta = document.querySelector<HTMLTextAreaElement>('form textarea[name], form textarea');
    if (ta) {
      ta.value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">AI-suggested reply</span>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : text ? 'Regenerate' : 'Draft a reply'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {text && (
        <div className="mt-3 space-y-2">
          <p className="whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm">{text}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={insert}>Use this draft</Button>
            <Button variant="ghost" size="sm" onClick={() => setText(null)}>Discard</Button>
          </div>
        </div>
      )}
    </div>
  );
}
