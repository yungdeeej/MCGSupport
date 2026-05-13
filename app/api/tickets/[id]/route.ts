import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { requireAgent, requireStudentAccess } from '@/lib/auth/requireOwnership';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { audit, auditActions } from '@/lib/audit';
import { errorResponse, ipFrom } from '@/lib/http-helpers';
import { notifyResolved } from '@/lib/tickets/notifications';

const Patch = z.object({
  status: z.enum(['open', 'in_progress', 'awaiting_student', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedAgentId: z.number().int().nullable().optional(),
  csatScore: z.number().int().min(1).max(5).optional(),
  csatComment: z.string().max(1000).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });
    const session = await getSession(req);
    const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    if (!t) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    await requireStudentAccess(session, t.studentId, { ip: ipFrom(req), route: `GET /api/tickets/${id}` });
    return NextResponse.json({ ticket: t });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });
    const session = await getSession(req);
    const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    if (!t) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const body = Patch.parse(await req.json());

    // Students can only set CSAT on their own resolved tickets.
    if (session?.userType === 'student') {
      if (session.userId !== t.studentId) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      if (Object.keys(body).some((k) => k !== 'csatScore' && k !== 'csatComment')) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      requireAgent(session);
    }

    const patch: Record<string, unknown> = {};
    if (body.status) {
      patch.status = body.status;
      if (body.status === 'resolved') patch.resolvedAt = new Date();
    }
    if (body.priority) patch.priority = body.priority;
    if (body.assignedAgentId !== undefined) patch.assignedAgentId = body.assignedAgentId;
    if (body.csatScore !== undefined) patch.csatScore = body.csatScore;
    if (body.csatComment !== undefined) patch.csatComment = body.csatComment;
    patch.updatedAt = new Date();
    await db.update(tickets).set(patch).where(eq(tickets.id, id));
    await audit({
      actor: session?.userType === 'student' ? { type: 'student', id: session.userId } : { type: 'agent', id: session!.userId },
      action: auditActions.TICKET_STATUS_CHANGED,
      resourceType: 'ticket',
      resourceId: id,
      payload: patch,
      ip: ipFrom(req),
    });
    if (body.status === 'resolved') {
      await notifyResolved(id).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
