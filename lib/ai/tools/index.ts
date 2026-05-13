import { zodToJsonSchema } from './zod-to-json';
import type { AnyTool } from './types';
import { searchKnowledgeBase } from './search_knowledge_base';
import { getMyProfile } from './get_my_profile';
import {
  getMySchedule,
  getMyCourses,
  getMyGrades,
  getMyAttendance,
  requestPasswordResetHelp,
} from './moodle_tools';
import { getMyOpenTickets, createTicket, escalateToHuman } from './ticket_tools';

export const allTools: AnyTool[] = [
  searchKnowledgeBase,
  getMyProfile,
  getMySchedule,
  getMyCourses,
  getMyGrades,
  getMyAttendance,
  getMyOpenTickets,
  requestPasswordResetHelp,
  createTicket,
  escalateToHuman,
];

export const toolMap = new Map(allTools.map((t) => [t.name, t]));

export function toolsForAnthropic() {
  return allTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: zodToJsonSchema(t.inputSchema),
  }));
}
