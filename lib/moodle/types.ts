import { z } from 'zod';

export const MoodleSiteInfo = z.object({
  sitename: z.string(),
  username: z.string().optional(),
  userid: z.number().int().optional(),
  release: z.string().optional(),
});

export const MoodleUser = z.object({
  id: z.number().int(),
  username: z.string().optional(),
  email: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  fullname: z.string().optional(),
  lastaccess: z.number().int().optional(),
});

export const MoodleUserResponse = z.array(MoodleUser);

export const MoodleCourse = z.object({
  id: z.number().int(),
  shortname: z.string(),
  fullname: z.string(),
  category: z.number().int().optional(),
  startdate: z.number().int().optional(),
  enddate: z.number().int().optional(),
  visible: z.number().int().optional(),
  progress: z.number().optional().nullable(),
});

export const MoodleCourseContents = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    section: z.number().int().optional(),
    summary: z.string().optional(),
    modules: z
      .array(
        z.object({
          id: z.number().int(),
          name: z.string(),
          modname: z.string(),
          url: z.string().optional(),
          description: z.string().optional(),
        }),
      )
      .optional(),
  }),
);

export const MoodleGradeItems = z.object({
  usergrades: z.array(
    z.object({
      courseid: z.number().int(),
      courseidnumber: z.string().optional(),
      gradeitems: z.array(
        z.object({
          id: z.number().int(),
          itemname: z.string().nullable().optional(),
          itemtype: z.string().optional(),
          gradeformatted: z.string().optional(),
          gradedatesubmitted: z.number().int().nullable().optional(),
          weightraw: z.number().nullable().optional(),
          weightformatted: z.string().nullable().optional(),
          feedback: z.string().nullable().optional(),
        }),
      ),
    }),
  ),
});

export const MoodleCalendarEvents = z.object({
  events: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      description: z.string().optional(),
      timestart: z.number().int(),
      timeduration: z.number().int().optional(),
      courseid: z.number().int().optional(),
      url: z.string().optional(),
    }),
  ),
});

export const MoodleAttendanceSessions = z.object({
  sessions: z.array(
    z.object({
      id: z.number().int(),
      sessdate: z.number().int(),
      duration: z.number().int().optional(),
      description: z.string().optional(),
      studentstatus: z
        .object({ acronym: z.string(), description: z.string().optional() })
        .optional(),
    }),
  ),
});

export const MoodlePasswordResetResponse = z.object({
  status: z.string(),
  notice: z.string().optional(),
  warnings: z.array(z.unknown()).optional(),
});
