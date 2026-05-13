import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { requireAgent } from '@/lib/auth/requireOwnership';
import { db } from '@/lib/db';
import { tickets, ticketMessages, students } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { anthropic } from '@/lib/ai/client';
import { env } from '@/lib/env';
import { hybridSearch } from '@/lib/kb/search';
import { errorResponse } from '@/lib/http-helpers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAgent(await getSession(req));
    const id = Number(params.id);
    const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    if (!t) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const msgs = await db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, id))
      .orderBy(asc(ticketMessages.id))
      .limit(50);
    const [stu] = await db
      .select({ firstName: students.firstName })
      .from(students)
      .where(eq(students.id, t.studentId))
      .limit(1);
    const transcript = msgs
      .map((m) => `${m.authorType.toUpperCase()}: ${m.bodyMd}`)
      .join('\n\n');
    const lastStudent = [...msgs].reverse().find((m) => m.authorType === 'student');
    const kbHits = lastStudent ? await hybridSearch(lastStudent.bodyMd, { limit: 3 }).catch(() => []) : [];
    const kbBlock = kbHits.length
      ? '\n\nRelevant KB:\n' +
        kbHits.map((h, i) => `[${i + 1}] ${h.title} (/kb/${h.slug})\n${h.snippet}`).join('\n\n')
      : '';
    const system = `You are an MCG Career College support advisor drafting a reply on behalf of a human. Be warm, concise (2-5 short paragraphs), action-oriented. Use the student's first name once. Never promise refunds, immigration outcomes, or grades. If finance/immigration/safety surfaces, suggest escalation in your draft.`;
    const user = `Draft a reply to the latest student message on ticket ${t.number}.\nSubject: ${t.subject}\nStudent first name: ${stu?.firstName ?? 'there'}\n\nFULL TICKET THREAD:\n${transcript}${kbBlock}\n\nDraft your reply below, in markdown. Do not include any salutation past one line ("Hi {name},"). Do not sign off — the agent will sign their name.`;

    const resp = await anthropic().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const draft = resp.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return NextResponse.json({ draft });
  } catch (err) {
    return errorResponse(err);
  }
}
