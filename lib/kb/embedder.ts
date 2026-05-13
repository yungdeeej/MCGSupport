import crypto from 'node:crypto';
import { db } from '../db';
import { kbArticles, kbEmbeddings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { chunkMarkdown } from './chunker';
import { embedBatch } from '../ai/embeddings';
import { logger } from '../logger';

export function contentHash(md: string): string {
  return crypto.createHash('sha256').update(md).digest('hex');
}

/**
 * Re-embed an article. Idempotent — if the content hash already matches the
 * stored hash we skip the OpenAI call. Run on article save and on a nightly
 * cron in case embeddings ever drift.
 */
export async function embedArticle(articleId: number): Promise<{ embedded: number; skipped: boolean }> {
  const [article] = await db.select().from(kbArticles).where(eq(kbArticles.id, articleId)).limit(1);
  if (!article) throw new Error(`article ${articleId} not found`);
  const hash = contentHash(article.contentMd);
  if (article.contentHash === hash) {
    return { embedded: 0, skipped: true };
  }
  const chunks = chunkMarkdown(article.title, article.contentMd);
  if (chunks.length === 0) {
    return { embedded: 0, skipped: true };
  }
  const vectors = await embedBatch(chunks.map((c) => c.text));
  // Replace all existing embeddings atomically.
  await db.transaction(async (tx) => {
    await tx.delete(kbEmbeddings).where(eq(kbEmbeddings.articleId, articleId));
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]!;
      const v = vectors[i];
      if (!v) continue;
      await tx.insert(kbEmbeddings).values({
        articleId,
        chunkIndex: c.index,
        chunkText: c.text,
        embedding: v,
        metadata: c.metadata,
      });
    }
    await tx.update(kbArticles).set({ contentHash: hash }).where(eq(kbArticles.id, articleId));
  });
  logger.info({ articleId, chunks: chunks.length }, 'article re-embedded');
  return { embedded: chunks.length, skipped: false };
}
