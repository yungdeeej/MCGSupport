import { env } from '../env';
import { fetchJSON } from '../http';
import { z } from 'zod';
import {
  MoodleSiteInfo,
  MoodleUser,
  MoodleCourse,
  MoodleCourseContents,
  MoodleGradeItems,
  MoodleCalendarEvents,
  MoodleAttendanceSessions,
  MoodlePasswordResetResponse,
} from './types';

/**
 * Moodle Web Services client. All functions go through the REST endpoint
 * with the token in the query string (Moodle does not accept headers).
 *
 * Pending Lingel Learning action (Section 4.2):
 *   - mod_attendance plugin enablement
 *   - core_auth_request_password_reset permission on the service account
 */

function endpoint(fn: string, params: Record<string, string | number | undefined> = {}) {
  const u = new URL(`${env.MOODLE_BASE_URL}/webservice/rest/server.php`);
  u.searchParams.set('wstoken', env.MOODLE_API_TOKEN);
  u.searchParams.set('wsfunction', fn);
  u.searchParams.set('moodlewsrestformat', 'json');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export const moodle = {
  getSiteInfo() {
    return fetchJSON({
      op: 'moodle.getSiteInfo',
      url: endpoint('core_webservice_get_site_info'),
      schema: MoodleSiteInfo.passthrough(),
    });
  },

  async getUserByEmail(email: string) {
    const u = new URL(`${env.MOODLE_BASE_URL}/webservice/rest/server.php`);
    u.searchParams.set('wstoken', env.MOODLE_API_TOKEN);
    u.searchParams.set('wsfunction', 'core_user_get_users_by_field');
    u.searchParams.set('moodlewsrestformat', 'json');
    u.searchParams.set('field', 'email');
    u.searchParams.append('values[0]', email);
    const users = await fetchJSON({
      op: 'moodle.getUserByEmail',
      url: u.toString(),
      schema: z.array(MoodleUser),
    });
    return users[0] ?? null;
  },

  getUsersEnrolledCourses(userId: number) {
    return fetchJSON({
      op: 'moodle.getUsersEnrolledCourses',
      url: endpoint('core_enrol_get_users_courses', { userid: userId }),
      schema: z.array(MoodleCourse),
    });
  },

  getCourseContents(courseId: number) {
    return fetchJSON({
      op: 'moodle.getCourseContents',
      url: endpoint('core_course_get_contents', { courseid: courseId }),
      schema: MoodleCourseContents,
    });
  },

  getUserGrades(userId: number, courseId?: number) {
    return fetchJSON({
      op: 'moodle.getUserGrades',
      url: endpoint('gradereport_user_get_grade_items', {
        userid: userId,
        ...(courseId ? { courseid: courseId } : {}),
      }),
      schema: MoodleGradeItems,
    });
  },

  getCalendarEvents(userId: number, timeStart: number, timeEnd: number) {
    const u = new URL(`${env.MOODLE_BASE_URL}/webservice/rest/server.php`);
    u.searchParams.set('wstoken', env.MOODLE_API_TOKEN);
    u.searchParams.set('wsfunction', 'core_calendar_get_calendar_events');
    u.searchParams.set('moodlewsrestformat', 'json');
    u.searchParams.append('events[userevents][0]', String(userId));
    u.searchParams.set('options[timestart]', String(timeStart));
    u.searchParams.set('options[timeend]', String(timeEnd));
    return fetchJSON({
      op: 'moodle.getCalendarEvents',
      url: u.toString(),
      schema: MoodleCalendarEvents,
    });
  },

  /**
   * Returns attendance sessions for a single Moodle course.
   * Requires mod_attendance plugin (Lingel must confirm/install).
   */
  getAttendanceSessions(courseId: number, userId: number) {
    return fetchJSON({
      op: 'moodle.getAttendanceSessions',
      url: endpoint('mod_attendance_get_sessions', {
        courseid: courseId,
        userid: userId,
      }),
      schema: MoodleAttendanceSessions,
    });
  },

  /**
   * Triggers Moodle's native forgot-password email. Per DJ, AI should NOT call
   * this directly — it should hand the student to the Moodle forgot-password
   * page so the audit trail lives in Moodle. We keep this method here for
   * exceptional cases where an agent on the human side wants to issue it.
   */
  requestPasswordReset(usernameOrEmail: string) {
    return fetchJSON({
      op: 'moodle.requestPasswordReset',
      url: endpoint('core_auth_request_password_reset', {
        username: usernameOrEmail,
      }),
      schema: MoodlePasswordResetResponse,
    });
  },
};

export type MoodleClient = typeof moodle;
