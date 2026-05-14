import { db } from '@/lib/db';
import { tickets, ticketMessages, students, agents } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { requireStudentAccess } from '@/lib/auth/requireOwnership';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, ticketNumber as fmtNum } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TicketReplyForm } from '@/components/tickets/TicketReplyForm';
import { TicketCsat } from '@/components/tickets/TicketCsat';

export const dynamic = 'force-dynamic';

export default async function TicketDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const session = await getSession();
  const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!t) notFound();
  const s = await requireStudentAccess(session, t.studentId);

  const messages = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(asc(ticketMessages.id));
  const visible = s.userType === 'agent' ? messages : messages.filter((m) => !m.internalNote);

  const agentIds = Array.from(
    new Set(visible.filter((m) => m.authorType === 'agent' && m.authorId).map((m) => m.authorId!)),
  );
  const agentRows = agentIds.length
    ? await db.select({ id: agents.id, name: agents.name }).from(agents).where(eq(agents.id, agentIds[0]!))
    : [];

  const [stu] = await db
    .select({ firstName: students.firstName, lastName: students.lastName })
    .from(students)
    .where(eq(students.id, t.studentId))
    .limit(1);

  return (
    <div className="container-page max-w-3xl py-10">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <span className="font-mono text-xs text-muted-foreground">{t.number || fmtNum(t.id)}</span>
        <h1 className="text-2xl font-semibold tracking-tightish">{t.subject}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="muted">{t.category}</Badge>
          <Badge variant={t.status === 'awaiting_student' ? 'warning' : 'secondary'}>
            {t.status.replace('_', ' ')}
          </Badge>
          <span>· Opened {formatDateTime(t.createdAt)}</span>
        </div>
      </header>

      <ol className="mt-6 space-y-4">
        {visible.map((m) => {
          const author =
            m.authorType === 'agent'
              ? agentRows.find((a) => a.id === m.authorId)?.name ?? 'MCG Advisor'
              : m.authorType === 'student'
                ? `${stu?.firstName ?? 'Student'} ${stu?.lastName ?? ''}`.trim()
                : m.authorType === 'ai'
                  ? 'MCG Assistant'
                  : 'System';
          return (
            <li
              key={m.id}
              className={`rounded-xl border p-4 ${
                m.internalNote
                  ? 'border-warning/30 bg-warning/5'
                  : m.authorType === 'student'
                    ? 'border-border bg-muted/30'
                    : 'border-secondary/30 bg-secondary/5'
              }`}
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium">
                  {author} {m.internalNote && <span className="ml-1 text-warning">· internal note</span>}
                </span>
                <span className="text-muted-foreground">{formatDateTime(m.createdAt)}</span>
              </div>
              <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.bodyMd}</ReactMarkdown>
              </div>
            </li>
          );
        })}
      </ol>

      {t.status !== 'closed' && (
        <div className="mt-6">
          <TicketReplyForm ticketId={t.id} canInternal={s.userType === 'agent'} />
        </div>
      )}

      {t.status === 'resolved' && s.userType === 'student' && !t.csatScore && (
        <div className="mt-8">
          <TicketCsat ticketId={t.id} />
        </div>
      )}
    </div>
  );
}
