import { z } from 'zod';
import { asAnyTool, type Tool } from './types';
import { db } from '../../db';
import { students, settingsCache } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { audit, toolCallAction } from '../../audit';

const Input = z.object({}).strict();
const Output = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  program: z.string().nullable(),
  campus: z.string().nullable(),
  admissionStage: z.string().nullable(),
  advisorName: z.string().nullable(),
});

async function lookupNameById(table: 'programs' | 'campuses', id: number | null): Promise<string | null> {
  if (!id) return null;
  const [row] = await db
    .select({ value: settingsCache.value })
    .from(settingsCache)
    .where(eq(settingsCache.key, table))
    .limit(1);
  if (!row) return null;
  const list = row.value as Array<{ id: number; name: string }> | null;
  return list?.find((x) => x.id === id)?.name ?? null;
}

export const getMyProfile = asAnyTool({
  name: 'get_my_profile',
  description: "Returns the signed-in student's profile: name, program, campus, advisor, and admission stage.",
  inputSchema: Input,
  outputSchema: Output,
  handler: async (_input, ctx) => {
    const [s] = await db
      .select()
      .from(students)
      .where(eq(students.id, ctx.studentId))
      .limit(1);
    if (!s) throw new Error('student not found');
    const program = await lookupNameById('programs', s.programId);
    const campus = await lookupNameById('campuses', s.campusId);
    await audit({
      actor: { type: 'ai' },
      action: toolCallAction('get_my_profile'),
      resourceType: 'student',
      resourceId: ctx.studentId,
      payload: {},
      ip: ctx.ip,
    });
    return {
      firstName: s.firstName,
      lastName: s.lastName,
      program,
      campus,
      admissionStage: null, // populated from settings_cache once stages synced
      advisorName: null, // populated once we sync staff
    };
  },
} satisfies Tool<z.infer<typeof Input>, z.infer<typeof Output>>);
