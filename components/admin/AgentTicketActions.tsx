'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'awaiting_student', label: 'Awaiting student' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
];

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export function AgentTicketActions({
  ticketId,
  status,
  priority,
}: {
  ticketId: number;
  status: string;
  priority: string;
}) {
  const router = useRouter();
  const [savedStatus, setSavedStatus] = useState(status);
  const [savedPriority, setSavedPriority] = useState(priority);
  const [saving, setSaving] = useState(false);

  async function update(patch: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border p-4 text-sm">
      <h2 className="font-medium">Actions</h2>
      <div className="mt-3 space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
          <select
            value={savedStatus}
            onChange={(e) => {
              setSavedStatus(e.target.value);
              update({ status: e.target.value });
            }}
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            disabled={saving}
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Priority</label>
          <select
            value={savedPriority}
            onChange={(e) => {
              setSavedPriority(e.target.value);
              update({ priority: e.target.value });
            }}
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            disabled={saving}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => update({ status: 'resolved' })}
          disabled={saving || savedStatus === 'resolved'}
        >
          Mark resolved
        </Button>
      </div>
    </div>
  );
}
