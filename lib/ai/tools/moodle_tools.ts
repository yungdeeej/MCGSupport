import { z } from 'zod';
import { asAnyTool, type Tool } from './types';
import { db } from '../../db';
import { students } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { moodle } from '../../moodle/client';
import { audit, toolCallAction } from '../../audit';
import { logger } from '../../logger';

async function studentEmail(studentId: number): Promise<string> {
  const [s] = await db.select({ email: students.email }).from(students).where(eq(students.id, studentId)).limit(1);
  if (!s) throw new Error('student not found');
  return s.email;
}

async function getMoodleUserId(studentId: number): Promise<number | null> {
  try {
    const email = await studentEmail(studentId);
    const u = await moodle.getUserByEmail(email);
    return u?.id ?? null;
  } catch (err) {
    logger.warn({ err }, 'moodle user lookup failed');
    return null;
  }
}

/* -------- get_my_schedule -------- */

const ScheduleInput = z.object({ when: z.enum(['today', 'tomorrow', 'this_week']).optional() });
const ScheduleOutput = z.object({
  classes: z.array(
    z.object({
      course: z.string(),
      time: z.string(),
      instructor: z.string().nullable(),
      room: z.string().nullable(),
      moodleUrl: z.string().nullable(),
    }),
  ),
});

export const getMySchedule = asAnyTool({
  name: 'get_my_schedule',
  description: "Returns the student's class schedule for today, tomorrow, or the upcoming 7 days.",
  inputSchema: ScheduleInput,
  outputSchema: ScheduleOutput,
  handler: async (input, ctx) => {
    const userId = await getMoodleUserId(ctx.studentId);
    if (!userId) return { classes: [] };
    const now = Math.floor(Date.now() / 1000);
    const span =
      input.when === 'today'
        ? 86400
        : input.when === 'tomorrow'
          ? 2 * 86400
          : 7 * 86400;
    const events = await moodle.getCalendarEvents(userId, now, now + span);
    await audit({
      actor: { type: 'ai' },
      action: toolCallAction('get_my_schedule'),
      resourceType: 'student',
      resourceId: ctx.studentId,
      payload: { when: input.when, count: events.events.length },
      ip: ctx.ip,
    });
    return {
      classes: events.events.map((e) => ({
        course: e.name,
        time: new Date(e.timestart * 1000).toLocaleString('en-CA', { timeZone: 'America/Edmonton' }),
        instructor: null,
        room: null,
        moodleUrl: e.url ?? null,
      })),
    };
  },
} satisfies Tool<z.infer<typeof ScheduleInput>, z.infer<typeof ScheduleOutput>>);

/* -------- get_my_courses -------- */

const CoursesInput = z.object({}).strict();
const CoursesOutput = z.object({
  courses: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      moodleUrl: z.string(),
      progress: z.number().nullable(),
    }),
  ),
});

export const getMyCourses = asAnyTool({
  name: 'get_my_courses',
  description: "Returns the student's currently enrolled Moodle courses.",
  inputSchema: CoursesInput,
  outputSchema: CoursesOutput,
  handler: async (_input, ctx) => {
    const userId = await getMoodleUserId(ctx.studentId);
    if (!userId) return { courses: [] };
    const courses = await moodle.getUsersEnrolledCourses(userId);
    await audit({
      actor: { type: 'ai' },
      action: toolCallAction('get_my_courses'),
      resourceType: 'student',
      resourceId: ctx.studentId,
      payload: { count: courses.length },
      ip: ctx.ip,
    });
    return {
      courses: courses.map((c) => ({
        code: c.shortname,
        name: c.fullname,
        moodleUrl: `${process.env.MOODLE_BASE_URL ?? ''}/course/view.php?id=${c.id}`,
        progress: c.progress ?? null,
      })),
    };
  },
} satisfies Tool<z.infer<typeof CoursesInput>, z.infer<typeof CoursesOutput>>);

/* -------- get_my_grades (sensitive — requires re-auth) -------- */

const GradesInput = z.object({ courseCode: z.string().optional() });
const GradesOutput = z.object({
  grades: z.array(
    z.object({
      course: z.string(),
      item: z.string(),
      grade: z.string(),
      weight: z.string().nullable(),
    }),
  ),
});

export const getMyGrades = asAnyTool({
  name: 'get_my_grades',
  description: "Returns the student's grades for one or all courses. Sensitive — requires recent re-auth.",
  inputSchema: GradesInput,
  outputSchema: GradesOutput,
  sensitive: true,
  handler: async (input, ctx) => {
    const userId = await getMoodleUserId(ctx.studentId);
    if (!userId) return { grades: [] };
    let courseId: number | undefined;
    if (input.courseCode) {
      const enrolled = await moodle.getUsersEnrolledCourses(userId);
      courseId = enrolled.find((c) => c.shortname === input.courseCode)?.id;
    }
    const data = courseId ? await moodle.getUserGrades(userId, courseId) : await moodle.getUserGrades(userId);
    await audit({
      actor: { type: 'ai' },
      action: toolCallAction('get_my_grades'),
      resourceType: 'student',
      resourceId: ctx.studentId,
      payload: { courseCode: input.courseCode },
      ip: ctx.ip,
    });
    const out: z.infer<typeof GradesOutput> = { grades: [] };
    for (const ug of data.usergrades) {
      for (const item of ug.gradeitems) {
        out.grades.push({
          course: ug.courseidnumber ?? String(ug.courseid),
          item: item.itemname ?? item.itemtype ?? 'item',
          grade: item.gradeformatted ?? '—',
          weight: item.weightformatted ?? null,
        });
      }
    }
    return out;
  },
} satisfies Tool<z.infer<typeof GradesInput>, z.infer<typeof GradesOutput>>);

/* -------- get_my_attendance (depends on mod_attendance) -------- */

const AttendanceInput = z.object({ courseCode: z.string().optional() });
const AttendanceOutput = z.object({
  sessions: z.array(z.object({ date: z.string(), status: z.string(), course: z.string() })),
  summary: z.object({
    present: z.number(),
    absent: z.number(),
    late: z.number(),
    percent: z.number(),
  }),
});

export const getMyAttendance = asAnyTool({
  name: 'get_my_attendance',
  description: "Returns the student's attendance record across courses. Requires mod_attendance enabled in Moodle.",
  inputSchema: AttendanceInput,
  outputSchema: AttendanceOutput,
  handler: async (input, ctx) => {
    const userId = await getMoodleUserId(ctx.studentId);
    if (!userId) {
      return { sessions: [], summary: { present: 0, absent: 0, late: 0, percent: 0 } };
    }
    const enrolled = await moodle.getUsersEnrolledCourses(userId);
    const targets = input.courseCode
      ? enrolled.filter((c) => c.shortname === input.courseCode)
      : enrolled;
    let present = 0,
      absent = 0,
      late = 0;
    const sessions: z.infer<typeof AttendanceOutput>['sessions'] = [];
    for (const c of targets) {
      try {
        const data = await moodle.getAttendanceSessions(c.id, userId);
        for (const sess of data.sessions) {
          const status = sess.studentstatus?.acronym ?? '—';
          if (status === 'P') present++;
          else if (status === 'L') late++;
          else if (status === 'A') absent++;
          sessions.push({
            date: new Date(sess.sessdate * 1000).toISOString(),
            status,
            course: c.shortname,
          });
        }
      } catch (err) {
        logger.warn({ err, courseId: c.id }, 'attendance fetch failed (plugin?)');
      }
    }
    const total = present + absent + late;
    const percent = total ? Math.round(((present + 0.5 * late) / total) * 100) : 0;
    await audit({
      actor: { type: 'ai' },
      action: toolCallAction('get_my_attendance'),
      resourceType: 'student',
      resourceId: ctx.studentId,
      payload: { sessions: sessions.length, percent },
      ip: ctx.ip,
    });
    return { sessions, summary: { present, absent, late, percent } };
  },
} satisfies Tool<z.infer<typeof AttendanceInput>, z.infer<typeof AttendanceOutput>>);

/* -------- request_password_reset_help -------- */

const ResetInput = z.object({ system: z.enum(['moodle', 'campuslogin']) });
const ResetOutput = z.object({
  instructions: z.array(z.string()),
  deepLinkUrl: z.string(),
});

export const requestPasswordResetHelp = asAnyTool({
  name: 'request_password_reset_help',
  description:
    'Provides step-by-step password-reset instructions and a deep link. Does NOT trigger the reset itself. Use for Moodle or CampusLogin password issues.',
  inputSchema: ResetInput,
  outputSchema: ResetOutput,
  handler: async (input, ctx) => {
    await audit({
      actor: { type: 'ai' },
      action: toolCallAction('request_password_reset_help'),
      resourceType: 'student',
      resourceId: ctx.studentId,
      payload: { system: input.system },
      ip: ctx.ip,
    });
    if (input.system === 'moodle') {
      return {
        instructions: [
          'Open the Moodle login page at mcgcollege.lingellearning.ca/login.',
          "Click 'Forgotten your username or password?' below the sign-in form.",
          'Enter your MCG email (the one ending in @mcgcollege.com or @student.mcgcollege.com).',
          'Check your inbox for a reset link from Moodle. It can take 1–2 minutes to arrive.',
          "If you don't see it, check Spam/Junk. The sender is noreply@mcgcollege.lingellearning.ca.",
          'Click the link, set a new password (min 8 chars, mixed case + number).',
          "If the email never arrives, open a support ticket — we'll loop in IT.",
        ],
        deepLinkUrl: 'https://mcgcollege.lingellearning.ca/login/forgot_password.php',
      };
    }
    return {
      instructions: [
        'CampusLogin password resets are handled by the student services team.',
        'Open a support ticket and we will route you to the right person within one business day.',
      ],
      deepLinkUrl: '/tickets/new',
    };
  },
} satisfies Tool<z.infer<typeof ResetInput>, z.infer<typeof ResetOutput>>);
