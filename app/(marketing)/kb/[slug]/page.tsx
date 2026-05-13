import { db } from '@/lib/db';
import { kbArticles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSession } from '@/lib/auth/session';
import { audit, auditActions } from '@/lib/audit';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const [a] = await db
    .select({ title: kbArticles.title, summary: kbArticles.summary })
    .from(kbArticles)
    .where(eq(kbArticles.slug, params.slug))
    .limit(1);
  if (!a) return {};
  return {
    title: `${a.title} · MCG Support`,
    description: a.summary ?? undefined,
  };
}

export default async function KbArticlePage({ params }: PageProps) {
  const session = await getSession();
  const [article] = await db
    .select()
    .from(kbArticles)
    .where(and(eq(kbArticles.slug, params.slug), eq(kbArticles.published, true)))
    .limit(1);
  if (!article) notFound();
  if (article.visibility === 'authenticated' && !session) {
    // Authenticated-only article — push to login.
    notFound(); // (Could redirect to /login?next; we keep it simple.)
  }

  // Best-effort view counter.
  await db
    .update(kbArticles)
    .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
    .where(eq(kbArticles.id, article.id))
    .catch(() => undefined);
  if (session) {
    void audit({
      actor:
        session.userType === 'student'
          ? { type: 'student', id: session.userId }
          : { type: 'agent', id: session.userId },
      action: auditActions.KB_ARTICLE_VIEWED,
      resourceType: 'kb_article',
      resourceId: article.id,
    });
  }

  return (
    <article className="container-page max-w-3xl py-10">
      <nav className="mb-4 text-xs text-muted-foreground">
        <a href="/kb" className="hover:underline">Knowledge Base</a>
        <span className="mx-1">/</span>
        <a href={`/kb?category=${article.category}`} className="hover:underline">
          {article.category}
        </a>
      </nav>
      <header>
        <Badge variant="muted">{article.category}</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tightish">{article.title}</h1>
        {article.summary && (
          <p className="mt-2 text-base text-muted-foreground">{article.summary}</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Last reviewed: {article.lastReviewedAt ? formatRelative(article.lastReviewedAt) : 'never'}
        </p>
      </header>
      <div className="prose prose-slate mt-8 max-w-none dark:prose-invert prose-headings:tracking-tightish prose-a:text-secondary prose-img:rounded-lg">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.contentMd}</ReactMarkdown>
      </div>
      <footer className="mt-10 rounded-xl border border-border bg-muted/30 p-5 text-sm">
        <p className="font-medium">Was this article helpful?</p>
        <p className="mt-1 text-muted-foreground">
          If something was unclear or out of date, open a ticket and we&apos;ll fix it.
        </p>
        <form action={`/api/kb/${article.id}/feedback`} method="post" className="mt-3 flex gap-2">
          <button name="vote" value="up" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
            👍 Yes
          </button>
          <button name="vote" value="down" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
            👎 No
          </button>
        </form>
      </footer>
    </article>
  );
}
