import { campusLogin } from './client';
import { db } from '../db';
import { students, settingsCache } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../logger';
import { env } from '../env';
import type { GetStudentResponse } from './types';

/**
 * Nightly sync (Phase 2). Pull all active students from CampusLogin and
 * upsert them into our `students` table. Settings endpoints (programs,
 * campuses, schools, admission stages) are cached in `settings_cache` with a
 * 24-hour TTL — they barely change.
 */

function statusFromAdmissionStageId(stageId: number | null | undefined):
  'active' | 'inactive' | 'graduated' | 'withdrawn' {
  // TODO: refine when DJ confirms stage IDs. Until then we trust the upstream
  // list endpoint to pre-filter for active admission status.
  if (stageId == null) return 'inactive';
  return 'active';
}

export async function syncStudents(): Promise<{ upserted: number }> {
  const filter: Record<string, unknown> = {};
  if (env.CAMPUSLOGIN_STUDENT_MAILLIST_ID) {
    filter.mailListId = env.CAMPUSLOGIN_STUDENT_MAILLIST_ID;
  }
  const resp = await campusLogin.listStudents(filter);
  let upserted = 0;
  for (const s of resp.items) {
    if (!s.email) continue; // can't onboard without an email
    await upsertStudent(s);
    upserted++;
  }
  logger.info({ upserted }, 'student sync complete');
  return { upserted };
}

async function upsertStudent(s: GetStudentResponse) {
  const email = s.email?.trim().toLowerCase();
  if (!email) return;
  const status = statusFromAdmissionStageId(s.addmissionId);

  const values = {
    campusloginId: s.id,
    campusloginGuid: s.guid ?? null,
    leadId: s.leadId ?? null,
    mailListId: s.mailListId ?? env.CAMPUSLOGIN_STUDENT_MAILLIST_ID ?? null,
    contactId: s.contactId ?? null,
    email,
    firstName: s.firstName ?? null,
    lastName: s.lastName ?? null,
    schoolId: s.schoolId ?? null,
    campusId: s.campusId ?? null,
    programId: s.programId ?? null,
    staffId: s.staffId ?? null,
    admissionStatusId: s.addmissionId ?? null,
    status,
    rawPayload: s as unknown,
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };

  // Upsert by campusloginId; preserve created_at.
  const [existing] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.campusloginId, s.id))
    .limit(1);
  if (existing) {
    await db.update(students).set(values).where(eq(students.id, existing.id));
  } else {
    await db.insert(students).values(values);
  }
}

export async function syncSettings(): Promise<void> {
  const [campuses, programs, schools, stages] = await Promise.all([
    campusLogin.getCampuses(),
    campusLogin.getPrograms(),
    campusLogin.getSchools(),
    campusLogin.getAdmissionStages(),
  ]);
  const upserts: Array<[string, unknown]> = [
    ['campuses', campuses],
    ['programs', programs],
    ['schools', schools],
    ['admission_stages', stages],
  ];
  for (const [key, value] of upserts) {
    await db
      .insert(settingsCache)
      .values({ key, value: value as object, refreshedAt: new Date() })
      .onConflictDoUpdate({
        target: settingsCache.key,
        set: { value: value as object, refreshedAt: new Date() },
      });
  }
  logger.info('settings sync complete');
}
