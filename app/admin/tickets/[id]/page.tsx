import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { tickets, ticketMessages, students, agents, aiConversations } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { requireAgent } from '@/lib/auth/requireOwnership';
import { audit, auditActions } from '@/lib/audit';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, ticketNumber as fmtNum } from '@/lib/utils';
import { TicketReplyForm } from '@/components/tickets/TicketReplyForm';
import { AgentTicketActions } from '@/components/admin/AgentTicketActions';
import { SuggestedReply } from '@/components/admin/SuggestedReply';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const dynamic = 'force-dynamic';

export default async function AgentTicketPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const session = requireAgent(await getSession());
  const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!t) notFound();
  await audit({
    actor: { type: 'agent', id: session.userId },
    action: auditActions.AGENT_VIEWED_STUDENT,
    resourceType: 'ticket',
    resourceId: id,
  });
  const [stu] = await db
    .select({ firstName: students.firstName, lastName: students.lastName, email: students.email })
    .from(students)
    .where(eq(students.id, t.studentId))
    .limit(1);
  const messages = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(asc(ticketMessages.id));
  const agentIds = Array.from(
    new Set(messages.filter((m) => m.authorType === 'agent' && m.authorId).map((m) => m.authorId!)),
  );
  const agentRows = agentIds.length
    ? await db.select({ id: agents.id, name: agents.name }).from(agents).where(eq(agents.id, agentIds[0]!))
    : [];

  let sourceConvo = null as Awaited<ReturnType<typeof db.select>> extends Array<infer X> ? X | null : null;
  if (t.sourceConversationId) {
    const [c] = await db
      .select({ id: aiConversations.id, totalTokensIn: aiConversations.totalTokensIn, totalTokensOut: aiConversations.totalTokensOut })
      .from(aiConversations)
      .where(eq(aiConversations.id, t.sourceConversationId))
      .limit(1);
    sourceConvo = (c ?? null) as typeof sourceConvo;
  }

  return (
    <div className="container-page max-w-5xl py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <article>
          <header className="flex flex-col gap-2 border-b border-border pb-4">
            <span className="font-mono text-xs text-muted-foreground">{t.number || fmtNum(t.id)}</span>
            <h1 className="text-2xl font-semibold tracking-tightish">{t.subject}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="muted">{t.category}</Badge>
              <Badge variant={t.priority === 'high' || t.priority === 'urgent' ? 'destructive' : 'muted'}>
                {t.priority}
              </Badge>
              <Badge variant={t.status === 'awaiting_student' ? 'warning' : 'secondary'}>
                {t.status.replace('_', ' ')}
              </Badge>
              <span>· Opened {formatDateTime(t.createdAt)}</span>
              {t.firstResponseAt && <span>· First reply {formatDateTime(t.firstResponseAt)}</span>}
            </div>
          </header>

          <ol className="mt-6 space-y-4">
            {messages.map((m) => {
              const author =
                m.authorType === 'agent'
                  ? agentRows.find((a) => a.id === m.authorId)?.name ?? 'Agent'
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
                      {author}
                      {m.internalNote && <span className="ml-1 text-warning">· internal note</span>}
                      {m.authorType === 'ai' && (
                        <span className="ml-1 text-muted-foreground">
                          {m.aiConfidence != null ? `· conf ${m.aiConfidence.toFixed(2)}` : ''}
                        </span>
                      )}
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

          <div className="mt-6">
            <SuggestedReply ticketId={t.id} />
            <div className="mt-4">
              <TicketReplyForm ticketId={t.id} canInternal />
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <AgentTicketActions ticketId={t.id} status={t.status} priority={t.priority} />
          <div className="rounded-xl border border-border p-4 text-sm">
            <h2 className="font-medium">Student</h2>
            <p className="mt-2">
              {stu?.firstName} {stu?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{stu?.email}</p>
          </div>
          {sourceConvo && (
            <div className="rounded-xl border border-border p-4 text-sm">
              <h2 className="font-medium">AI context</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                This ticket came from AI conversation #{sourceConvo.id}.<br />
                Tokens: {sourceConvo.totalTokensIn ?? 0} in / {sourceConvo.totalTokensOut ?? 0} out.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
