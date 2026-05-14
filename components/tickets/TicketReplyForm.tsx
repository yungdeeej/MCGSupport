'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export function TicketReplyForm({ ticketId, canInternal }: { ticketId: number; canInternal: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
          const res = await fetch(`/api/tickets/${ticketId}/messages`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ bodyMd: body, internalNote: internal }),
          });
          if (!res.ok) {
            setError('Could not post reply');
            return;
          }
          setBody('');
          setInternal(false);
          router.refresh();
        } catch {
          setError('Network error');
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={1}
        maxLength={8000}
        placeholder={internal ? 'Internal note (not visible to student)…' : 'Type your reply…'}
        className="min-h-[120px]"
      />
      <div className="flex items-center justify-between gap-3">
        {canInternal && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Internal note
          </label>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading || !body.trim()} className="ml-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reply'}
        </Button>
      </div>
    </form>
  );
}
