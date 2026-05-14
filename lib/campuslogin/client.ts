import { env } from '../env';
import { fetchJSON } from '../http';
import { logger } from '../logger';
import {
  GetStudentResponse,
  ListStudentsResponse,
  SchoolProgram,
  Campus,
  AdmissionStage,
  School,
  ListWrap,
  AddNoteResponse,
} from './types';

/**
 * Thin typed wrapper around CampusLogin's connector API. **Never** instantiated
 * on the client — only imported from server code. All credentials are pulled
 * from env at call time so rotated keys take effect on the next request.
 */

function baseHeaders(): Record<string, string> {
  return {
    'X-Api-Key': env.CAMPUSLOGIN_API_KEY,
    'X-Org-Id': String(env.CAMPUSLOGIN_ORG_ID),
  };
}

function url(path: string) {
  return `${env.CAMPUSLOGIN_BASE_URL}${path}`;
}

export const campusLogin = {
  getStudent(studentId: number) {
    return fetchJSON({
      op: 'campuslogin.getStudent',
      url: url(`/api/Students/${studentId}`),
      headers: baseHeaders(),
      schema: GetStudentResponse,
    });
  },

  listStudents(filter: Record<string, unknown> = {}) {
    return fetchJSON({
      op: 'campuslogin.listStudents',
      method: 'POST',
      url: url('/api/Students/Students'),
      headers: baseHeaders(),
      body: filter,
      schema: ListStudentsResponse,
    });
  },

  getContactProfile(mailListId: number, contactId: number) {
    return fetchJSON({
      op: 'campuslogin.getContactProfile',
      url: url(`/api/ContactSheet/ContactProfile/${mailListId}/${contactId}`),
      headers: baseHeaders(),
      // Schema is intentionally permissive — these are large nested objects.
      schema: GetStudentResponse.passthrough(),
    });
  },

  getProgramProfiles(contactId: number) {
    return fetchJSON({
      op: 'campuslogin.getProgramProfiles',
      url: url(`/api/Leads/ProgramProfiles/${contactId}`),
      headers: baseHeaders(),
      schema: ListWrap(SchoolProgram),
    });
  },

  getSchools() {
    return fetchJSON({
      op: 'campuslogin.getSchools',
      url: url('/api/Settings/Schools'),
      headers: baseHeaders(),
      schema: ListWrap(School),
    });
  },

  getCampuses() {
    return fetchJSON({
      op: 'campuslogin.getCampuses',
      url: url('/api/Settings/Campuses'),
      headers: baseHeaders(),
      schema: ListWrap(Campus),
    });
  },

  getPrograms() {
    return fetchJSON({
      op: 'campuslogin.getPrograms',
      url: url('/api/Settings/SchoolPrograms'),
      headers: baseHeaders(),
      schema: ListWrap(SchoolProgram),
    });
  },

  getAdmissionStages() {
    return fetchJSON({
      op: 'campuslogin.getAdmissionStages',
      url: url('/api/Settings/AdmissionStages'),
      headers: baseHeaders(),
      schema: ListWrap(AdmissionStage),
    });
  },

  addNote(body: { contactId: number; mailListId: number; noteText: string; staffId?: number }) {
    logger.info({ op: 'addNote', contactId: body.contactId }, 'adding note to student');
    return fetchJSON({
      op: 'campuslogin.addNote',
      method: 'POST',
      url: url('/api/Notes/AddNewNote'),
      headers: baseHeaders(),
      body,
      schema: AddNoteResponse,
    });
  },
};

export type CampusLoginClient = typeof campusLogin;
