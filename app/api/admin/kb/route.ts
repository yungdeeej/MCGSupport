import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { requireAgent } from '@/lib/auth/requireOwnership';
import { db } from '@/lib/db';
import { kbArticles, kbArticleVersions } from '@/lib/db/schema';
import { errorResponse } from '@/lib/http-helpers';
import { audit, auditActions } from '@/lib/audit';
import { embedArticle } from '@/lib/kb/embedder';

const Body = z.object({
  title: z.string().min(2).max(160),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  summary: z.string().max(400).optional().nullable(),
  category: z.string().min(2),
  visibility: z.enum(['public', 'authenticated']),
  contentMd: z.string().min(10),
  published: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const session = requireAgent(await getSession(req));
    const body = Body.parse(await req.json());
    const [row] = await db
      .insert(kbArticles)
      .values({ ...body, ownerAgentId: session.userId })
      .returning({ id: kbArticles.id });
    if (!row) throw new Error('insert failed');
    await db.insert(kbArticleVersions).values({
      articleId: row.id,
      version: 1,
      title: body.title,
      contentMd: body.contentMd,
      editedBy: session.userId,
    });
    await audit({
      actor: { type: 'agent', id: session.userId },
      action: auditActions.KB_ARTICLE_CREATED,
      resourceType: 'kb_article',
      resourceId: row.id,
    });
    // Best-effort embedding refresh.
    embedArticle(row.id).catch(() => undefined);
    return NextResponse.json({ id: row.id });
  } catch (err) {
    return errorResponse(err);
  }
}
