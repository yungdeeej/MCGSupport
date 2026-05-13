/**
 * Idempotent seed script. Creates:
 *   - The MVP admin agent (DJ) per Section 5.3.
 *   - The starter KB articles (Section 9.3) — drafted as stubs.
 *   - Settings cache rows so tools that look up program/campus names don't 404.
 *
 * Safe to run multiple times: conflicts are handled via onConflictDoUpdate.
 */
import 'dotenv/config';
import { db } from '../lib/db';
import { agents, kbArticles, settingsCache } from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { embedArticle } from '../lib/kb/embedder';
import { logger } from '../lib/logger';
import { seedArticles } from './seed-articles';

async function main() {
  // 1. Admin agent (DJ).
  await db
    .insert(agents)
    .values({
      email: 'dj.gupta@mcgcollege.com',
      name: 'DJ Gupta',
      role: 'admin',
      campusIds: [1, 2, 3, 4],
      active: true,
    })
    .onConflictDoUpdate({
      target: agents.email,
      set: { name: 'DJ Gupta', role: 'admin', active: true },
    });

  // 2. Settings reference data (placeholders — real values come from CampusLogin sync).
  await db
    .insert(settingsCache)
    .values({
      key: 'campuses',
      value: [
        { id: 1, name: 'Calgary' },
        { id: 2, name: 'Red Deer' },
        { id: 3, name: 'Cold Lake' },
        { id: 4, name: 'Edmonton' },
      ],
      refreshedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settingsCache.key,
      set: { value: sql`excluded.value`, refreshedAt: new Date() },
    });

  await db
    .insert(settingsCache)
    .values({
      key: 'programs',
      value: [
        { id: 101, name: 'Business Administration' },
        { id: 102, name: 'Health Care Aide' },
        { id: 103, name: 'Practical Nurse' },
        { id: 104, name: 'Pharmacy Technician' },
        { id: 105, name: 'Early Learning & Child Care' },
      ],
      refreshedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settingsCache.key,
      set: { value: sql`excluded.value`, refreshedAt: new Date() },
    });

  // 3. KB articles.
  for (const a of seedArticles) {
    const [existing] = await db
      .select({ id: kbArticles.id })
      .from(kbArticles)
      .where(eq(kbArticles.slug, a.slug))
      .limit(1);
    if (existing) {
      await db
        .update(kbArticles)
        .set({
          title: a.title,
          summary: a.summary,
          contentMd: a.contentMd,
          category: a.category,
          visibility: a.visibility,
          published: true,
          updatedAt: new Date(),
          lastReviewedAt: new Date(),
        })
        .where(eq(kbArticles.id, existing.id));
      logger.info({ slug: a.slug }, 'updated article');
      // Skip embedding in seed if OPENAI_API_KEY missing; embedder will silently no-op.
      await embedArticle(existing.id).catch(() => undefined);
    } else {
      const [row] = await db
        .insert(kbArticles)
        .values({
          slug: a.slug,
          title: a.title,
          summary: a.summary,
          contentMd: a.contentMd,
          category: a.category,
          visibility: a.visibility,
          published: true,
          lastReviewedAt: new Date(),
        })
        .returning({ id: kbArticles.id });
      logger.info({ slug: a.slug, id: row?.id }, 'inserted article');
      if (row) await embedArticle(row.id).catch(() => undefined);
    }
  }

  logger.info('seed complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
