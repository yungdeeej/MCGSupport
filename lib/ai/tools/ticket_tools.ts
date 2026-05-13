import { z } from 'zod';
import { asAnyTool, type Tool } from './types';
import { db } from '../../db';
import { tickets, ticketMessages, students } from '../../db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { audit, auditActions, toolCallAction } from '../../audit';
import { ticketNumber } from '../../utils';
import { notifyTicketCreated } from '../../tickets/notifications';

/* -------- get_my_open_tickets -------- */

const ListInput = z.object({}).strict();
const ListOutput = z.object({
  tickets: z.array(
    z.object({
      number: z.string(),
      subject: z.string(),
      status: z.string(),
      lastUpdate: z.string(),
    }),
  ),
});

export const getMyOpenTickets = asAnyTool({
  name: 'get_my_open_tickets',
  description: "Returns the signed-in student's open and in-progress tickets.",
  inputSchema: ListInput,
  outputSchema: ListOutput,
  handler: async (_input, ctx) => {
    const rows = await db
      .select({
        number: tickets.number,
        subject: tickets.subject,
        status: tickets.status,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.studentId, ctx.studentId),
          inArray(tickets.status, ['open', 'in_progress', 'awaiting_student']),
        ),
      )
      .orderBy(desc(tickets.updatedAt))
      .limit(20);
    await audit({
      actor: { type: 'ai' },
      action: toolCallAction('get_my_open_tickets'),
      resourceType: 'student',
      resourceId: ctx.studentId,
      payload: { count: rows.length },
      ip: ctx.ip,
    });
    return {
      tickets: rows.map((r) => ({
        number: r.number,
        subject: r.subject,
        status: r.status,
        lastUpdate: r.updatedAt.toISOString(),
      })),
    };
  },
} satisfies Tool<z.infer<typeof ListInput>, z.infer<typeof ListOutput>>);

/* -------- create_ticket (requires confirmation) -------- */

const CreateInput = z.object({
  subject: z.string().min(4).max(140),
  category: z.enum([
    'moodle',
    'schedule',
    'payments',
    'account',
    'academic',
    'international',
    'other',
  ]),
  description: z.string().min(10).max(4000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});
const CreateOutput = z.object({
  ticketNumber: z.string(),
  url: z.string(),
});

export const createTicket = asAnyTool({
  name: 'create_ticket',
  description:
    'Files a support ticket for the signed-in student. The model MUST confirm subject and category with the student before calling.',
  requiresConfirmation: true,
  inputSchema: CreateInput,
  outputSchema: CreateOutput,
  handler: async (input, ctx) => {
    const [s] = await db
      .select({ campusId: students.campusId })
      .from(students)
      .where(eq(students.id, ctx.studentId))
      .limit(1);
    const [t] = await db
      .insert(tickets)
      .values({
        number: 'pending', // placeholder, updated below
        studentId: ctx.studentId,
        subject: input.subject,
        category: input.category,
        priority: input.priority ?? 'normal',
        status: 'open',
        aiHandledInitial: true,
        sourceConversationId: ctx.conversationId,
        campusId: s?.campusId ?? null,
      })
      .returning({ id: tickets.id });
    if (!t) throw new Error('failed to insert ticket');
    const number = ticketNumber(t.id);
    await db.update(tickets).set({ number }).where(eq(tickets.id, t.id));
    await db.insert(ticketMessages).values({
      ticketId: t.id,
      authorType: 'student',
      authorId: ctx.studentId,
      bodyMd: input.description,
    });
    await audit({
      actor: { type: 'ai' },
      action: auditActions.TICKET_CREATED,
      resourceType: 'ticket',
      resourceId: t.id,
      payload: { via: 'ai', category: input.category, priority: input.priority ?? 'normal' },
      ip: ctx.ip,
    });
    await notifyTicketCreated(t.id).catch(() => undefined);
    return { ticketNumber: number, url: `/tickets/${t.id}` };
  },
} satisfies Tool<z.infer<typeof CreateInput>, z.infer<typeof CreateOutput>>);

/* -------- escalate_to_human (priority high) -------- */

const EscalateInput = z.object({
  reason: z.string().min(4).max(140),
  summary: z.string().min(10).max(4000),
});
const EscalateOutput = z.object({
  ticketNumber: z.string(),
  estimatedResponseTime: z.string(),
});

export const escalateToHuman = asAnyTool({
  name: 'escalate_to_human',
  description:
    'Creates a high-priority ticket and routes immediately to a human advisor. Use for safety, immigration, finance, mental-health, or "speak to a human" requests.',
  inputSchema: EscalateInput,
  outputSchema: EscalateOutput,
  handler: async (input, ctx) => {
    const [s] = await db
      .select({ campusId: students.campusId })
      .from(students)
      .where(eq(students.id, ctx.studentId))
      .limit(1);
    const [t] = await db
      .insert(tickets)
      .values({
        number: 'pending',
        studentId: ctx.studentId,
        subject: input.reason.slice(0, 140),
        category: 'other',
        priority: 'high',
        status: 'open',
        aiHandledInitial: true,
        escalationReason: input.reason,
        sourceConversationId: ctx.conversationId,
        campusId: s?.campusId ?? null,
      })
      .returning({ id: tickets.id });
    if (!t) throw new Error('failed to insert ticket');
    const number = ticketNumber(t.id);
    await db.update(tickets).set({ number }).where(eq(tickets.id, t.id));
    await db.insert(ticketMessages).values({
      ticketId: t.id,
      authorType: 'student',
      authorId: ctx.studentId,
      bodyMd: input.summary,
    });
    await audit({
      actor: { type: 'ai' },
      action: auditActions.TICKET_CREATED,
      resourceType: 'ticket',
      resourceId: t.id,
      payload: { escalation: true, reason: input.reason },
      ip: ctx.ip,
    });
    await notifyTicketCreated(t.id, { escalation: true }).catch(() => undefined);
    return {
      ticketNumber: number,
      estimatedResponseTime: 'within 4 business hours (9–5 MT, Mon–Fri)',
    };
  },
} satisfies Tool<z.infer<typeof EscalateInput>, z.infer<typeof EscalateOutput>>);
