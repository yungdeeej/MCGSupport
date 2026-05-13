import { db } from '@/lib/db';
import { tickets, aiConversations, kbArticles } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { MetricsCharts } from '@/components/admin/MetricsCharts';

export const dynamic = 'force-dynamic';

async function loadMetrics() {
  const [totals] = await db.execute(sql<{
    open_count: number;
    inprog_count: number;
    resolved_24h: number;
    median_first_response_min: number;
    csat_avg: number;
  }>`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open') AS open_count,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS inprog_count,
      COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= now() - interval '24 hours') AS resolved_24h,
      EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY first_response_at - created_at)) / 60 AS median_first_response_min,
      AVG(csat_score) FILTER (WHERE csat_score BETWEEN 1 AND 5) AS csat_avg
    FROM tickets
  `).then((r) => r.rows as unknown as Array<{
    open_count: number;
    inprog_count: number;
    resolved_24h: number;
    median_first_response_min: number;
    csat_avg: number;
  }>);

  const tickets14 = await db.execute(sql`
    SELECT date_trunc('day', created_at)::date AS day,
           COUNT(*) FILTER (WHERE ai_handled_initial = false) AS human,
           COUNT(*) FILTER (WHERE ai_handled_initial = true) AS ai
    FROM tickets
    WHERE created_at >= now() - interval '14 days'
    GROUP BY 1 ORDER BY 1
  `);

  const convo14 = await db.execute(sql`
    SELECT date_trunc('day', started_at)::date AS day,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE resolved_by_ai = true) AS resolved_by_ai,
           SUM(cost_cents) AS cost_cents
    FROM ai_conversations
    WHERE started_at >= now() - interval '14 days'
    GROUP BY 1 ORDER BY 1
  `);

  return {
    totals: totals ?? { open_count: 0, inprog_count: 0, resolved_24h: 0, median_first_response_min: 0, csat_avg: 0 },
    ticketsByDay: tickets14.rows as Array<{ day: string; human: number; ai: number }>,
    convosByDay: convo14.rows as Array<{ day: string; total: number; resolved_by_ai: number; cost_cents: number }>,
  };
}

export default async function MetricsPage() {
  const m = await loadMetrics();
  const articleCount = await db.execute(sql`SELECT COUNT(*) AS n FROM kb_articles WHERE published = true`);
  const articles = Number((articleCount.rows[0] as { n: string | number } | undefined)?.n ?? 0);
  void kbArticles; void aiConversations; void tickets;
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-semibold tracking-tightish">Metrics</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last 14 days unless otherwise stated.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Open tickets" value={Number(m.totals.open_count ?? 0)} />
        <Stat title="In progress" value={Number(m.totals.inprog_count ?? 0)} />
        <Stat title="Resolved (24h)" value={Number(m.totals.resolved_24h ?? 0)} />
        <Stat
          title="Median first response"
          value={m.totals.median_first_response_min ? `${Math.round(Number(m.totals.median_first_response_min))} min` : '—'}
        />
        <Stat title="CSAT (avg)" value={m.totals.csat_avg ? Number(m.totals.csat_avg).toFixed(2) : '—'} />
        <Stat title="Published KB articles" value={articles} />
      </div>

      <div className="mt-8">
        <MetricsCharts
          ticketsByDay={m.ticketsByDay.map((d) => ({ day: String(d.day), human: Number(d.human), ai: Number(d.ai) }))}
          convosByDay={m.convosByDay.map((d) => ({
            day: String(d.day),
            total: Number(d.total),
            resolved_by_ai: Number(d.resolved_by_ai),
            cost_cents: Number(d.cost_cents),
          }))}
        />
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
