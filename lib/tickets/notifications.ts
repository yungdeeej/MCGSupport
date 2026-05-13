import { db } from '../db';
import { tickets, ticketMessages, students, agents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, renderTicketReplyEmail } from '../email';
import { env } from '../env';
import { pickAgentFor, assignTicket } from './routing';
import { logger } from '../logger';

function ticketUrl(id: number) {
  return `${env.APP_URL || ''}/tickets/${id}`;
}

export async function notifyTicketCreated(ticketId: number, opts: { escalation?: boolean } = {}) {
  const [t] = await db
    .select({
      id: tickets.id,
      number: tickets.number,
      subject: tickets.subject,
      studentId: tickets.studentId,
      campusId: tickets.campusId,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) return;

  const agentId = await pickAgentFor(t.id, t.campusId ?? null);
  if (agentId) await assignTicket(t.id, agentId);

  // Email the assigned agent.
  if (agentId) {
    const [a] = await db.select({ email: agents.email, name: agents.name }).from(agents).where(eq(agents.id, agentId)).limit(1);
    if (a?.email) {
      const subject = `${opts.escalation ? '[ESCALATION] ' : ''}New ticket ${t.number} · ${t.subject}`;
      await sendEmail({
        to: a.email,
        subject,
        text: `You have a new ${opts.escalation ? 'escalated' : ''} ticket: ${t.number} — ${t.subject}\n\n${ticketUrl(t.id)}`,
        html: `<p>You have a new ${opts.escalation ? '<strong>escalated</strong>' : ''} ticket: <strong>${t.number}</strong> — ${t.subject}</p><p><a href="${ticketUrl(t.id)}">Open ticket</a></p>`,
        tag: 'agent-new-ticket',
      }).catch((err) => logger.error({ err }, 'agent notify failed'));
    }
  }
}

export async function notifyAgentReply(ticketId: number, messageId: number) {
  const [m] = await db.select().from(ticketMessages).where(eq(ticketMessages.id, messageId)).limit(1);
  const [t] = await db
    .select({ id: tickets.id, number: tickets.number, subject: tickets.subject, studentId: tickets.studentId })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!m || !t || m.internalNote) return;
  const [s] = await db
    .select({ email: students.email, firstName: students.firstName })
    .from(students)
    .where(eq(students.id, t.studentId))
    .limit(1);
  if (!s) return;
  const excerpt = (m.bodyMd ?? '').replace(/\n+/g, ' ').slice(0, 240);
  const { text, html } = renderTicketReplyEmail({
    studentName: s.firstName,
    ticketNumber: t.number,
    ticketSubject: t.subject,
    replyExcerpt: excerpt,
    url: ticketUrl(t.id),
  });
  await sendEmail({
    to: s.email,
    subject: `New reply on ${t.number} · ${t.subject}`,
    text,
    html,
    tag: 'student-ticket-reply',
  }).catch((err) => logger.error({ err }, 'student notify failed'));
}

export async function notifyResolved(ticketId: number) {
  const [t] = await db
    .select({ id: tickets.id, number: tickets.number, subject: tickets.subject, studentId: tickets.studentId })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) return;
  const [s] = await db
    .select({ email: students.email, firstName: students.firstName })
    .from(students)
    .where(eq(students.id, t.studentId))
    .limit(1);
  if (!s) return;
  await sendEmail({
    to: s.email,
    subject: `Resolved · ${t.number} ${t.subject}`,
    text: `Your ticket ${t.number} (${t.subject}) has been marked resolved. You'll get a quick rating email shortly so we can keep improving.\n\nView ticket: ${ticketUrl(t.id)}`,
    html: `<p>Hi ${s.firstName ?? 'there'},</p><p>Your ticket <strong>${t.number}</strong> (${t.subject}) has been marked <strong>resolved</strong>. You'll get a quick rating email shortly so we can keep improving.</p><p><a href="${ticketUrl(t.id)}">View ticket</a></p>`,
    tag: 'student-ticket-resolved',
  }).catch((err) => logger.error({ err }, 'resolved notify failed'));
}
