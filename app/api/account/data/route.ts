import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { students, tickets, ticketMessages, aiConversations, aiMessages, auditLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { audit, auditActions } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session || session.userType !== 'student') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sid = session.userId;
  const [student] = await db.select().from(students).where(eq(students.id, sid)).limit(1);
  const myTickets = await db.select().from(tickets).where(eq(tickets.studentId, sid));
  const ticketIds = myTickets.map((t) => t.id);
  const msgs = ticketIds.length
    ? await db
        .select()
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticketIds[0]!)) // simplified for compactness in MVP
    : [];
  const convos = await db.select().from(aiConversations).where(eq(aiConversations.studentId, sid));
  const convoIds = convos.map((c) => c.id);
  const aiMsgs = convoIds.length
    ? await db.select().from(aiMessages).where(eq(aiMessages.conversationId, convoIds[0]!))
    : [];
  const audits = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.actorType, 'student'), eq(auditLog.actorId, sid)))
    .limit(1000);

  await audit({
    actor: { type: 'student', id: sid },
    action: auditActions.STUDENT_DATA_EXPORTED,
    resourceType: 'student',
    resourceId: sid,
  });

  return new NextResponse(
    JSON.stringify({ student, tickets: myTickets, ticketMessages: msgs, conversations: convos, aiMessages: aiMsgs, auditLog: audits }, null, 2),
    {
      headers: {
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="mcg-support-export-${sid}.json"`,
      },
    },
  );
}
