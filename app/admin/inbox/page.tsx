import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets, students } from '@/lib/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { formatRelative, ticketNumber as fmtNum } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';

export const metadata = { title: 'Inbox · MCG Admin' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { status?: string; mine?: string; category?: string };
}

export default async function Inbox({ searchParams }: PageProps) {
  const session = (await getSession())!;
  const statusFilter = searchParams.status;
  const mine = searchParams.mine === '1';
  const cat = searchParams.category;

  const where = and(
    statusFilter ? eq(tickets.status, statusFilter as 'open') : sql`true`,
    mine ? eq(tickets.assignedAgentId, session.userId) : sql`true`,
    cat ? eq(tickets.category, cat) : sql`true`,
  );

  const rows = await db
    .select({
      id: tickets.id,
      number: tickets.number,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      category: tickets.category,
      updatedAt: tickets.updatedAt,
      studentId: tickets.studentId,
      assignedAgentId: tickets.assignedAgentId,
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(tickets)
    .leftJoin(students, eq(students.id, tickets.studentId))
    .where(where)
    .orderBy(desc(tickets.updatedAt))
    .limit(200);

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tightish">Inbox</h1>
        <div className="text-sm text-muted-foreground">{rows.length} tickets</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Filter label="All" href="/admin/inbox" active={!statusFilter && !mine} />
        <Filter label="Assigned to me" href="/admin/inbox?mine=1" active={mine} />
        <Filter label="Open" href="/admin/inbox?status=open" active={statusFilter === 'open'} />
        <Filter label="In progress" href="/admin/inbox?status=in_progress" active={statusFilter === 'in_progress'} />
        <Filter label="Awaiting student" href="/admin/inbox?status=awaiting_student" active={statusFilter === 'awaiting_student'} />
        <Filter label="Resolved" href="/admin/inbox?status=resolved" active={statusFilter === 'resolved'} />
      </div>

      <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
        {rows.map((t) => (
          <li key={t.id}>
            <Link
              href={`/admin/tickets/${t.id}`}
              className="grid grid-cols-12 gap-3 p-4 text-sm hover:bg-muted/40"
            >
              <span className="col-span-2 font-mono text-xs text-muted-foreground">
                {t.number || fmtNum(t.id)}
              </span>
              <span className="col-span-5 min-w-0 truncate font-medium">{t.subject}</span>
              <span className="col-span-2 truncate text-muted-foreground">
                {t.firstName} {t.lastName}
              </span>
              <span className="col-span-1">
                <Badge variant={t.priority === 'high' || t.priority === 'urgent' ? 'destructive' : 'muted'}>
                  {t.priority}
                </Badge>
              </span>
              <span className="col-span-1">
                <Badge variant={t.status === 'awaiting_student' ? 'warning' : 'secondary'}>
                  {t.status.replace('_', ' ')}
                </Badge>
              </span>
              <span className="col-span-1 text-right text-xs text-muted-foreground">
                {formatRelative(t.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Filter({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 ${
        active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
