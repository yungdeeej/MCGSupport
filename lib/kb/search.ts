import { sql } from 'drizzle-orm';
import { db } from '../db';
import { embed } from '../ai/embeddings';

export interface SearchHit {
  articleId: number;
  slug: string;
  title: string;
  snippet: string;
  category: string;
  score: number;
  source: 'vector' | 'keyword' | 'fused';
}

export interface SearchOptions {
  category?: string;
  visibility?: 'public' | 'authenticated' | 'any';
  limit?: number;
  campusId?: number;
  programId?: number;
}

/**
 * Hybrid search: top-K by vector similarity + top-K by trigram match,
 * fused via Reciprocal Rank Fusion (RRF, k=60). The RRF constant softens
 * outliers so a single strong vector hit doesn't dominate a keyword match
 * (and vice-versa).
 */
export async function hybridSearch(
  query: string,
  opts: SearchOptions = {},
): Promise<SearchHit[]> {
  const limit = opts.limit ?? 5;
  const k = 10;

  let vectorHits: Array<{ id: number; slug: string; title: string; snippet: string; category: string; sim: number }> = [];
  try {
    const v = await embed(query);
    const vlit = `[${v.join(',')}]`;
    const rows = await db.execute(sql<{
      id: number;
      slug: string;
      title: string;
      snippet: string;
      category: string;
      sim: number;
    }>`
      SELECT a.id, a.slug, a.title, a.category, e.chunk_text AS snippet,
             1 - (e.embedding <=> ${vlit}::vector) AS sim
      FROM kb_embeddings e
      JOIN kb_articles a ON a.id = e.article_id
      WHERE a.published = true
        ${opts.category ? sql`AND a.category = ${opts.category}` : sql``}
      ORDER BY e.embedding <=> ${vlit}::vector
      LIMIT ${k}
    `);
    vectorHits = (rows.rows as unknown[]).map((r) => r as typeof vectorHits[number]);
  } catch {
    // If embeddings backend is down (e.g. local dev without OpenAI key), fall
    // back to keyword-only search rather than erroring out.
    vectorHits = [];
  }

  const kwRows = await db.execute(sql<{
    id: number;
    slug: string;
    title: string;
    snippet: string;
    category: string;
    score: number;
  }>`
    SELECT a.id, a.slug, a.title, a.category,
           substr(a.content_md, 1, 240) AS snippet,
           GREATEST(similarity(a.title, ${query}), similarity(a.content_md, ${query})) AS score
    FROM kb_articles a
    WHERE a.published = true
      ${opts.category ? sql`AND a.category = ${opts.category}` : sql``}
      AND (a.title % ${query} OR a.content_md % ${query})
    ORDER BY score DESC
    LIMIT ${k}
  `);
  const keywordHits = (kwRows.rows as unknown[]).map((r) => r as {
    id: number;
    slug: string;
    title: string;
    snippet: string;
    category: string;
    score: number;
  });

  // Reciprocal Rank Fusion.
  const RRF_K = 60;
  const fused = new Map<number, SearchHit>();
  vectorHits.forEach((h, idx) => {
    const score = 1 / (RRF_K + idx + 1);
    fused.set(h.id, {
      articleId: h.id,
      slug: h.slug,
      title: h.title,
      snippet: h.snippet,
      category: h.category,
      score,
      source: 'vector',
    });
  });
  keywordHits.forEach((h, idx) => {
    const add = 1 / (RRF_K + idx + 1);
    const existing = fused.get(h.id);
    if (existing) {
      existing.score += add;
      existing.source = 'fused';
    } else {
      fused.set(h.id, {
        articleId: h.id,
        slug: h.slug,
        title: h.title,
        snippet: h.snippet,
        category: h.category,
        score: add,
        source: 'keyword',
      });
    }
  });

  return Array.from(fused.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export const VECTOR_HIGH_CONFIDENCE = 0.78;
export const VECTOR_MEDIUM_CONFIDENCE = 0.65;
