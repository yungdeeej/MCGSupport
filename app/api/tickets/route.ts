import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { requireSession } from '@/lib/auth/requireOwnership';
import { db } from '@/lib/db';
import { tickets, ticketMessages, students } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { errorResponse, ipFrom } from '@/lib/http-helpers';
import { audit, auditActions } from '@/lib/audit';
import { ticketNumber } from '@/lib/utils';
import { notifyTicketCreated } from '@/lib/tickets/notifications';

const Body = z.object({
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

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(await getSession(req));
    if (session.userType !== 'student') {
      return NextResponse.json({ error: 'students only' }, { status: 403 });
    }
    const body = Body.parse(await req.json());
    const [s] = await db
      .select({ campusId: students.campusId })
      .from(students)
      .where(eq(students.id, session.userId))
      .limit(1);
    const [t] = await db
      .insert(tickets)
      .values({
        number: 'pending',
        studentId: session.userId,
        subject: body.subject,
        category: body.category,
        priority: body.priority ?? 'normal',
        status: 'open',
        campusId: s?.campusId ?? null,
      })
      .returning({ id: tickets.id });
    if (!t) throw new Error('failed to create ticket');
    const num = ticketNumber(t.id);
    await db.update(tickets).set({ number: num }).where(eq(tickets.id, t.id));
    await db.insert(ticketMessages).values({
      ticketId: t.id,
      authorType: 'student',
      authorId: session.userId,
      bodyMd: body.description,
    });
    await audit({
      actor: { type: 'student', id: session.userId },
      action: auditActions.TICKET_CREATED,
      resourceType: 'ticket',
      resourceId: t.id,
      payload: { category: body.category, priority: body.priority ?? 'normal' },
      ip: ipFrom(req),
    });
    await notifyTicketCreated(t.id).catch(() => undefined);
    return NextResponse.json({ id: t.id, number: num });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(await getSession(req));
    if (session.userType !== 'student') {
      return NextResponse.json({ error: 'students only' }, { status: 403 });
    }
    const rows = await db
      .select()
      .from(tickets)
      .where(eq(tickets.studentId, session.userId))
      .orderBy(desc(tickets.updatedAt))
      .limit(100);
    return NextResponse.json({ tickets: rows });
  } catch (err) {
    return errorResponse(err);
  }
}
