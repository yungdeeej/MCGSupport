import { db } from '@/lib/db';
import { students, settingsCache } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = { title: 'My account · MCG Support' };
export const dynamic = 'force-dynamic';

async function lookupName(table: 'programs' | 'campuses', id: number | null): Promise<string | null> {
  if (!id) return null;
  const [row] = await db
    .select({ value: settingsCache.value })
    .from(settingsCache)
    .where(eq(settingsCache.key, table))
    .limit(1);
  if (!row) return null;
  const list = row.value as Array<{ id: number; name: string }> | null;
  return list?.find((x) => x.id === id)?.name ?? null;
}

export default async function AccountPage() {
  const session = (await getSession())!;
  const [s] = await db.select().from(students).where(eq(students.id, session.userId)).limit(1);
  if (!s) return null;
  const [program, campus] = await Promise.all([
    lookupName('programs', s.programId),
    lookupName('campuses', s.campusId),
  ]);
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-2xl font-semibold tracking-tightish">My account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Profile data pulled from MCG&apos;s student record.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name">{s.firstName} {s.lastName}</Row>
            <Row label="Email">{s.email}</Row>
            <Row label="Program">{program ?? '—'}</Row>
            <Row label="Campus">{campus ?? '—'}</Row>
            <Row label="Status">{s.status}</Row>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>You control your data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Download everything we have about you, or ask us to delete it after withdrawal.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" asChild>
                <Link href="/api/account/data">Download my data (JSON)</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/account/reauth">Re-verify for sensitive actions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}
