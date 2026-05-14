import Link from 'next/link';
import { Search, MessagesSquare, Calendar, CreditCard, UserCircle, BookOpen } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { tickets, students } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SearchBox } from '@/components/kb/SearchBox';

export default async function HomePage() {
  const session = await getSession();
  let firstName: string | null = null;
  let openTickets: Array<{ id: number; number: string; subject: string; status: string; updatedAt: Date }> = [];

  if (session?.userType === 'student') {
    const [s] = await db
      .select({ firstName: students.firstName })
      .from(students)
      .where(eq(students.id, session.userId))
      .limit(1);
    firstName = s?.firstName ?? null;
    openTickets = await db
      .select({
        id: tickets.id,
        number: tickets.number,
        subject: tickets.subject,
        status: tickets.status,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.studentId, session.userId),
          inArray(tickets.status, ['open', 'in_progress', 'awaiting_student']),
        ),
      )
      .orderBy(desc(tickets.updatedAt))
      .limit(5);
  }

  return (
    <div className="container-page py-12 sm:py-16">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-3xl font-semibold tracking-tightish sm:text-4xl">
          {firstName ? `How can we help, ${firstName}?` : 'How can we help?'}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Search the knowledge base, ask the assistant, or open a ticket.
        </p>
        <div className="mt-6">
          <SearchBox />
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-3xl">
        <Link
          href={session ? '/chat' : '/login?next=/chat'}
          className="group relative block overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-50 to-background p-6 shadow-sm transition hover:shadow-md dark:from-brand-950/40 dark:to-background sm:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <MessagesSquare className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Ask MCG Assistant</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get instant answers about your classes, schedule, Moodle, attendance, and more.
                Connects you with a human when needed.
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="mx-auto mt-12 max-w-3xl">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Popular topics
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TopicPill href="/kb?category=moodle" icon={<BookOpen className="h-4 w-4" />} label="Moodle" />
          <TopicPill href="/kb?category=schedule" icon={<Calendar className="h-4 w-4" />} label="Schedule" />
          <TopicPill href="/kb?category=payments" icon={<CreditCard className="h-4 w-4" />} label="Payments" />
          <TopicPill href="/kb?category=account" icon={<UserCircle className="h-4 w-4" />} label="Account" />
        </div>
      </section>

      {session?.userType === 'student' && (
        <section className="mx-auto mt-12 max-w-3xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              My tickets {openTickets.length > 0 && `(${openTickets.length} open)`}
            </h3>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href="/tickets">View all →</Link>
            </Button>
          </div>
          {openTickets.length === 0 ? (
            <Card className="mt-3">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No open tickets — nice.</p>
                <p className="text-xs text-muted-foreground">
                  When the assistant can&apos;t resolve something, it&apos;ll open a ticket and route to a real advisor.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {openTickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tickets/${t.id}`}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.subject}</p>
                      <p className="font-mono text-xs text-muted-foreground">{t.number}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={t.status === 'awaiting_student' ? 'warning' : 'secondary'}>
                        {t.status.replace('_', ' ')}
                      </Badge>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatRelative(t.updatedAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function TopicPill({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  );
}
