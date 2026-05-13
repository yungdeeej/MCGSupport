import { db } from '../db';
import { agents, tickets } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { env } from '../env';

/**
 * Single-helpdesk MVP routing (Section 8.2): auto-assign to DJ's user.
 * Falls back to round-robin among campus-eligible agents if more than one
 * exists — keeps the v1.1 code path warm without changing behavior today.
 */
export async function pickAgentFor(ticketId: number, campusId: number | null): Promise<number | null> {
  // 1. Prefer the configured helpdesk lead.
  const [primary] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.email, env.SUPPORT_HELPDESK_EMAIL), eq(agents.active, true)))
    .limit(1);
  if (primary) return primary.id;

  // 2. Round-robin among active agents that handle this campus.
  const where = campusId != null
    ? and(eq(agents.active, true), sql`${agents.campusIds} @> ARRAY[${campusId}]::int[]`)
    : eq(agents.active, true);
  const candidates = await db.select({ id: agents.id }).from(agents).where(where);
  if (candidates.length === 0) return null;
  // Use ticketId as a stable seed for distribution.
  const idx = ticketId % candidates.length;
  return candidates[idx]!.id;
}

export async function assignTicket(ticketId: number, agentId: number) {
  await db.update(tickets).set({ assignedAgentId: agentId }).where(eq(tickets.id, ticketId));
}
