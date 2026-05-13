import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelative, ticketNumber as fmtNum } from '@/lib/utils';
import { Plus, Inbox } from 'lucide-react';

export const metadata = { title: 'My tickets · MCG Support' };
export const dynamic = 'force-dynamic';

export default async function TicketsList() {
  const session = (await getSession())!;
  const rows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.studentId, session.userId))
    .orderBy(desc(tickets.updatedAt))
    .limit(200);
  return (
    <div className="container-page py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tightish">My tickets</h1>
        <Button asChild>
          <Link href="/tickets/new"><Plus className="h-4 w-4" /> New ticket</Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border p-8 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No tickets yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a ticket when you need a human, or just{' '}
            <Link href="/chat" className="underline">ask the assistant</Link> first.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
          {rows.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tickets/${t.id}`}
                className="flex flex-col gap-2 p-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.subject}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{t.number || fmtNum(t.id)}</span>
                    <span>·</span>
                    <span>{t.category}</span>
                    <span>·</span>
                    <span>Updated {formatRelative(t.updatedAt)}</span>
                  </div>
                </div>
                <Badge variant={statusVariant(t.status)} className="self-start sm:self-auto">
                  {t.status.replace('_', ' ')}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusVariant(status: string): 'default' | 'secondary' | 'warning' | 'success' | 'muted' {
  switch (status) {
    case 'awaiting_student':
      return 'warning';
    case 'resolved':
    case 'closed':
      return 'success';
    case 'in_progress':
      return 'secondary';
    default:
      return 'muted';
  }
}
