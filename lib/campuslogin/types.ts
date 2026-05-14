import { z } from 'zod';

/**
 * Hand-authored Zod schemas for the CampusLogin endpoints we consume.
 * Once docs/swagger.json is supplied by DJ we replace this with
 * openapi-typescript-generated types; until then these provide runtime
 * validation at the boundary and a single editable contract.
 */

export const CampusLoginField = z.object({
  fieldId: z.number().int().optional(),
  fieldKey: z.string().optional(),
  label: z.string().optional(),
  value: z.unknown().optional(),
});
export type CampusLoginField = z.infer<typeof CampusLoginField>;

export const GetStudentResponse = z.object({
  id: z.number().int(),
  guid: z.string().uuid().optional().nullable(),
  leadId: z.number().int().optional().nullable(),
  schoolId: z.number().int().optional().nullable(),
  campusId: z.number().int().optional().nullable(),
  programId: z.number().int().optional().nullable(),
  staffId: z.number().int().optional().nullable(),
  addmissionId: z.number().int().optional().nullable(), // sic — matches API spelling
  mailListId: z.number().int().optional().nullable(),
  contactId: z.number().int().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  alternatePhone: z.string().optional().nullable(),
  createDate: z.string().optional().nullable(),
  leadDate: z.string().optional().nullable(),
  commonFields: z.array(CampusLoginField).optional(),
  customFields: z.array(CampusLoginField).optional(),
  attributeFields: z.array(CampusLoginField).optional(),
  stageFields: z.array(CampusLoginField).optional(),
});
export type GetStudentResponse = z.infer<typeof GetStudentResponse>;

export const ListStudentsResponse = z.object({
  items: z.array(GetStudentResponse),
  total: z.number().int().optional(),
});
export type ListStudentsResponse = z.infer<typeof ListStudentsResponse>;

export const SchoolProgram = z.object({
  id: z.number().int(),
  schoolId: z.number().int().optional(),
  name: z.string(),
  code: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const Campus = z.object({
  id: z.number().int(),
  name: z.string(),
  city: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const AdmissionStage = z.object({
  id: z.number().int(),
  name: z.string(),
  isFinal: z.boolean().optional(),
});

export const School = z.object({
  id: z.number().int(),
  name: z.string(),
  active: z.boolean().optional(),
});

export const ListWrap = <T extends z.ZodType>(t: T) => z.array(t);

export const AddNoteResponse = z.object({
  id: z.number().int(),
  contactId: z.number().int(),
  noteText: z.string().optional(),
});
