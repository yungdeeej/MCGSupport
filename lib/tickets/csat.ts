import { db } from '../db';
import { tickets, students } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../email';
import { env } from '../env';

const CSAT_DELAY_MS = 4 * 60 * 60 * 1000; // 4 hours per spec

export function csatUrl(ticketId: number, score: number) {
  return `${env.APP_URL || ''}/tickets/${ticketId}/csat?score=${score}`;
}

/**
 * Schedule a CSAT email. In MVP we just rely on a cron to scan for tickets
 * resolved more than 4h ago without a csat_score and send the email once.
 */
export async function sendDueCsatEmails(now: Date = new Date()): Promise<{ sent: number }> {
  const cutoff = new Date(now.getTime() - CSAT_DELAY_MS);
  const rows = await db.execute(
    /* sql */ `
    SELECT t.id, t.number, t.subject, t.student_id, s.email AS student_email, s.first_name
    FROM tickets t
    JOIN students s ON s.id = t.student_id
    WHERE t.status = 'resolved' AND t.csat_score IS NULL AND t.resolved_at <= '${cutoff.toISOString()}'
    LIMIT 100
    ` as unknown as string,
  );
  let sent = 0;
  for (const raw of rows.rows as unknown[]) {
    const r = raw as {
      id: number;
      number: string;
      subject: string;
      student_id: number;
      student_email: string;
      first_name: string | null;
    };
    const buttons = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<a href="${csatUrl(r.id, n)}" style="display:inline-block;text-decoration:none;padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;color:#1d2c3c;margin-right:4px">${'⭐'.repeat(n)}</a>`,
      )
      .join('');
    await sendEmail({
      to: r.student_email,
      subject: `How did we do? · ${r.number}`,
      text: `Hi ${r.first_name ?? 'there'}, your ticket ${r.number} was resolved. Rate us 1–5: ${[1, 2, 3, 4, 5]
        .map((n) => `${n}: ${csatUrl(r.id, n)}`)
        .join(' | ')}`,
      html: `<p>Hi ${r.first_name ?? 'there'}, your ticket <strong>${r.number}</strong> (${r.subject}) was resolved.</p><p>How did we do?</p><p>${buttons}</p>`,
      tag: 'csat',
    });
    sent++;
    // mark as sent by stamping a sentinel score of 0 (overwritten by real rating)
    await db.update(tickets).set({ csatScore: 0 }).where(eq(tickets.id, r.id));
  }
  return { sent };
}

void students;
