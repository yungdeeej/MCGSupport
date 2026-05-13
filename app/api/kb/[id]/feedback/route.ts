import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { kbArticles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const vote = form.get('vote');
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });
  if (vote === 'up') {
    await db
      .update(kbArticles)
      .set({ helpfulCount: sql`${kbArticles.helpfulCount} + 1` })
      .where(eq(kbArticles.id, id));
  } else if (vote === 'down') {
    await db
      .update(kbArticles)
      .set({ notHelpfulCount: sql`${kbArticles.notHelpfulCount} + 1` })
      .where(eq(kbArticles.id, id));
  }
  // Redirect back to article. Pass-through ref if present.
  const ref = req.headers.get('referer') ?? '/kb';
  return NextResponse.redirect(ref, { status: 303 });
}
