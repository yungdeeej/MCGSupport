import Link from 'next/link';
import { db } from '@/lib/db';
import { kbArticles } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { hybridSearch } from '@/lib/kb/search';
import { SearchBox } from '@/components/kb/SearchBox';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { q?: string; category?: string };
}

export default async function KbIndex({ searchParams }: PageProps) {
  const q = (searchParams.q ?? '').trim();
  const cat = searchParams.category;

  let hits = null as Awaited<ReturnType<typeof hybridSearch>> | null;
  if (q) {
    hits = await hybridSearch(q, { category: cat, limit: 20 }).catch(() => []);
  }

  const articles = await db
    .select({
      id: kbArticles.id,
      slug: kbArticles.slug,
      title: kbArticles.title,
      summary: kbArticles.summary,
      category: kbArticles.category,
      viewCount: kbArticles.viewCount,
    })
    .from(kbArticles)
    .where(
      and(
        eq(kbArticles.published, true),
        eq(kbArticles.visibility, 'public'),
        cat ? eq(kbArticles.category, cat) : sql`true`,
      ),
    )
    .orderBy(desc(kbArticles.viewCount))
    .limit(50);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold tracking-tightish">Knowledge Base</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Self-serve answers, written and maintained by the MCG advising team.
      </p>
      <div className="mt-6">
        <SearchBox defaultValue={q} />
      </div>

      {q ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {hits && hits.length > 0
              ? `${hits.length} result${hits.length === 1 ? '' : 's'} for "${q}"`
              : `No results for "${q}"`}
          </h2>
          <ul className="mt-3 grid gap-3">
            {hits?.map((h) => (
              <li key={h.articleId} className="card-base p-5">
                <Link href={`/kb/${h.slug}`} className="block">
                  <div className="flex items-center gap-2">
                    <Badge variant="muted" className="text-[10px]">{h.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      match · {h.source}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{h.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {h.snippet}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {cat ? `Category: ${cat}` : 'Popular articles'}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {articles.map((a) => (
              <li key={a.id} className="card-base p-5">
                <Link href={`/kb/${a.slug}`} className="block">
                  <Badge variant="muted" className="text-[10px]">{a.category}</Badge>
                  <h3 className="mt-2 text-base font-semibold">{a.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {a.summary ?? 'Tap to read.'}
                  </p>
                </Link>
              </li>
            ))}
            {articles.length === 0 && (
              <li className="text-sm text-muted-foreground">No articles yet.</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
