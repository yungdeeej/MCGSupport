import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { kbArticles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { KbEditor } from '@/components/admin/KbEditor';

export const dynamic = 'force-dynamic';

export default async function EditArticle({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [a] = await db.select().from(kbArticles).where(eq(kbArticles.id, id)).limit(1);
  if (!a) notFound();
  return (
    <div className="container-page max-w-4xl py-8">
      <h1 className="text-2xl font-semibold tracking-tightish">Edit article</h1>
      <p className="mt-1 text-sm text-muted-foreground">Saving regenerates embeddings.</p>
      <div className="mt-6">
        <KbEditor article={a} />
      </div>
    </div>
  );
}
