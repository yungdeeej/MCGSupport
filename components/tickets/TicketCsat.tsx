'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function TicketCsat({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  if (submitted) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
        Thanks — we use this to keep improving.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold">How did we do?</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        One-click rating. Optional comment — totally up to you.
      </p>
      <div className="mt-3 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setScore(n)}
            type="button"
            aria-label={`Rate ${n}`}
            className={`h-10 w-10 rounded-lg border text-lg ${
              score === n
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted'
            }`}
          >
            {'⭐'.repeat(n)}
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything to share?"
        className="mt-3"
      />
      <Button
        className="mt-3"
        disabled={!score}
        onClick={async () => {
          if (!score) return;
          await fetch(`/api/tickets/${ticketId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ csatScore: score, csatComment: comment || undefined }),
          });
          setSubmitted(true);
          router.refresh();
        }}
      >
        Submit
      </Button>
    </div>
  );
}
