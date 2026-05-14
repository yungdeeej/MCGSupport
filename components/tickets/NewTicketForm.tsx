'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const CATEGORIES = [
  { id: 'moodle', label: 'Moodle / online learning' },
  { id: 'schedule', label: 'Schedule / classes' },
  { id: 'payments', label: 'Payments / tuition' },
  { id: 'account', label: 'Account / profile' },
  { id: 'academic', label: 'Academic / grades' },
  { id: 'international', label: 'International / study permit' },
  { id: 'other', label: 'Other' },
];

export function NewTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
          const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ subject, category, description }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => null);
            setError(j?.error ?? 'Could not file ticket');
            return;
          }
          const j = await res.json();
          router.push(`/tickets/${j.id}`);
        } catch {
          setError('Network error');
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-4 rounded-2xl border border-border bg-card p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          minLength={4}
          maxLength={140}
          required
          placeholder="Short summary"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">What&apos;s going on?</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minLength={10}
          maxLength={4000}
          required
          className="min-h-[160px]"
          placeholder="Include details — error messages, dates, course codes, anything that helps an advisor."
        />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit ticket'}
      </Button>
    </form>
  );
}
