import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { requireStudentAccess } from '@/lib/auth/requireOwnership';
import { db } from '@/lib/db';
import { tickets, ticketMessages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { audit, auditActions } from '@/lib/audit';
import { notifyAgentReply } from '@/lib/tickets/notifications';
import { errorResponse, ipFrom } from '@/lib/http-helpers';

const Body = z.object({
  bodyMd: z.string().min(1).max(8000),
  internalNote: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const session = await getSession(req);
    const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    if (!t) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const s = await requireStudentAccess(session, t.studentId, { ip: ipFrom(req) });
    const where =
      s.userType === 'agent'
        ? eq(ticketMessages.ticketId, id)
        : eq(ticketMessages.ticketId, id);
    const rows = await db
      .select()
      .from(ticketMessages)
      .where(where)
      .orderBy(ticketMessages.id);
    // Strip internal notes from student view.
    const filtered = s.userType === 'agent' ? rows : rows.filter((r) => !r.internalNote);
    return NextResponse.json({ messages: filtered });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const session = await getSession(req);
    const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    if (!t) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const s = await requireStudentAccess(session, t.studentId, { ip: ipFrom(req) });
    const body = Body.parse(await req.json());

    if (body.internalNote && s.userType !== 'agent') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const [m] = await db
      .insert(ticketMessages)
      .values({
        ticketId: id,
        authorType: s.userType,
        authorId: s.userId,
        bodyMd: body.bodyMd,
        internalNote: body.internalNote ?? false,
      })
      .returning({ id: ticketMessages.id });

    // Side effects: update status + first response timestamp.
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (s.userType === 'agent' && !body.internalNote) {
      if (!t.firstResponseAt) updates.firstResponseAt = new Date();
      if (t.status === 'open' || t.status === 'awaiting_student') {
        updates.status = 'in_progress';
      }
    } else if (s.userType === 'student' && t.status === 'awaiting_student') {
      updates.status = 'in_progress';
    }
    await db.update(tickets).set(updates).where(eq(tickets.id, id));

    await audit({
      actor: { type: s.userType, id: s.userId },
      action: auditActions.TICKET_REPLY,
      resourceType: 'ticket',
      resourceId: id,
      payload: { internalNote: body.internalNote ?? false },
      ip: ipFrom(req),
    });

    if (s.userType === 'agent' && !body.internalNote && m) {
      await notifyAgentReply(id, m.id).catch(() => undefined);
    }

    return NextResponse.json({ ok: true, id: m?.id });
  } catch (err) {
    return errorResponse(err);
  }
}
