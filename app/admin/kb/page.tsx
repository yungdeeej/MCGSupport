import Link from 'next/link';
import { db } from '@/lib/db';
import { kbArticles } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function KbAdminList() {
  const rows = await db
    .select()
    .from(kbArticles)
    .orderBy(desc(kbArticles.updatedAt))
    .limit(200);

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tightish">Knowledge Base</h1>
        <Button asChild>
          <Link href="/admin/kb/new"><Plus className="h-4 w-4" /> New article</Link>
        </Button>
      </div>
      <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
        {rows.map((a) => (
          <li key={a.id}>
            <Link href={`/admin/kb/${a.id}/edit`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="muted">{a.category}</Badge>
                  <span>{a.visibility}</span>
                  <span>· Updated {formatRelative(a.updatedAt)}</span>
                  <span>· {a.viewCount} views</span>
                </div>
              </div>
              <Badge variant={a.published ? 'success' : 'muted'}>{a.published ? 'Published' : 'Draft'}</Badge>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="p-8 text-center text-sm text-muted-foreground">
            No articles yet — seed some with <code>npm run db:seed</code>.
          </li>
        )}
      </ul>
    </div>
  );
}
