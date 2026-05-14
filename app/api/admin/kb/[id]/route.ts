import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { requireAgent, requireAdmin } from '@/lib/auth/requireOwnership';
import { db } from '@/lib/db';
import { kbArticles, kbArticleVersions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { audit, auditActions } from '@/lib/audit';
import { embedArticle } from '@/lib/kb/embedder';
import { errorResponse } from '@/lib/http-helpers';

const Body = z.object({
  title: z.string().min(2).max(160),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  summary: z.string().max(400).optional().nullable(),
  category: z.string().min(2),
  visibility: z.enum(['public', 'authenticated']),
  contentMd: z.string().min(10),
  published: z.boolean(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireAgent(await getSession(req));
    const id = Number(params.id);
    const body = Body.parse(await req.json());
    const [existing] = await db.select().from(kbArticles).where(eq(kbArticles.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const newVersion = existing.version + 1;
    await db
      .update(kbArticles)
      .set({
        ...body,
        version: newVersion,
        updatedAt: new Date(),
        lastReviewedAt: new Date(),
      })
      .where(eq(kbArticles.id, id));
    await db.insert(kbArticleVersions).values({
      articleId: id,
      version: newVersion,
      title: body.title,
      contentMd: body.contentMd,
      editedBy: session.userId,
    });
    await audit({
      actor: { type: 'agent', id: session.userId },
      action: auditActions.KB_ARTICLE_EDITED,
      resourceType: 'kb_article',
      resourceId: id,
      payload: { version: newVersion },
    });
    embedArticle(id).catch(() => undefined);
    return NextResponse.json({ id });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireAdmin(await getSession(req));
    const id = Number(params.id);
    await db.delete(kbArticles).where(eq(kbArticles.id, id));
    await audit({
      actor: { type: 'agent', id: session.userId },
      action: auditActions.KB_ARTICLE_DELETED,
      resourceType: 'kb_article',
      resourceId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
