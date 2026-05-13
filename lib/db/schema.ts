import {
  pgTable,
  serial,
  bigserial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
  real,
  customType,
  inet,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* ---------- custom types ---------- */

export const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'citext';
  },
});

export const vector = (dim: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dim})`;
    },
    toDriver(value: number[]) {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: string) {
      return JSON.parse(value) as number[];
    },
  })('embedding');

/* ---------- enums ---------- */

export const userTypeEnum = pgEnum('user_type', ['student', 'agent']);
export const studentStatusEnum = pgEnum('student_status', [
  'active',
  'inactive',
  'graduated',
  'withdrawn',
]);
export const agentRoleEnum = pgEnum('agent_role', ['agent', 'admin']);
export const authPurposeEnum = pgEnum('auth_purpose', ['login', 'reauth']);
export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'awaiting_student',
  'resolved',
  'closed',
]);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'normal', 'high', 'urgent']);
export const messageAuthorEnum = pgEnum('message_author', ['student', 'ai', 'agent', 'system']);
export const visibilityEnum = pgEnum('kb_visibility', ['public', 'authenticated']);
export const brandEnum = pgEnum('kb_brand', ['mcg', 'infocus', 'collegeadmissions']);
export const aiMessageRoleEnum = pgEnum('ai_message_role', ['user', 'assistant', 'tool_result']);
export const auditActorEnum = pgEnum('audit_actor_type', ['student', 'agent', 'system', 'ai']);
export const satisfactionEnum = pgEnum('ai_satisfaction', ['helpful', 'not_helpful']);

/* ---------- students ---------- */

export const students = pgTable(
  'students',
  {
    id: serial('id').primaryKey(),
    campusloginId: integer('campuslogin_id').notNull().unique(),
    campusloginGuid: uuid('campuslogin_guid'),
    leadId: integer('lead_id'),
    mailListId: integer('mail_list_id'),
    contactId: integer('contact_id'),
    email: citext('email').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    schoolId: integer('school_id'),
    campusId: integer('campus_id'),
    programId: integer('program_id'),
    staffId: integer('staff_id'),
    admissionStatusId: integer('admission_status_id'),
    status: studentStatusEnum('status').notNull().default('active'),
    rawPayload: jsonb('raw_payload'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index('students_email_idx').on(t.email),
    statusIdx: index('students_status_idx').on(t.status),
    campusIdx: index('students_campus_idx').on(t.campusId),
  }),
);

/* ---------- agents ---------- */

export const agents = pgTable('agents', {
  id: serial('id').primaryKey(),
  email: citext('email').notNull().unique(),
  name: text('name').notNull(),
  role: agentRoleEnum('role').notNull().default('agent'),
  campusIds: integer('campus_ids').array().notNull().default(sql`'{}'::int[]`),
  totpSecretEncrypted: text('totp_secret_encrypted'),
  totpEnabled: boolean('totp_enabled').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- sessions ---------- */

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id').notNull(),
    userType: userTypeEnum('user_type').notNull(),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    reauthedAt: timestamp('reauthed_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId, t.userType),
    expiresIdx: index('sessions_expires_idx').on(t.expiresAt),
  }),
);

/* ---------- auth tokens (magic links) ---------- */

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: serial('id').primaryKey(),
    email: citext('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    purpose: authPurposeEnum('purpose').notNull().default('login'),
    userType: userTypeEnum('user_type').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ip: inet('ip'),
  },
  (t) => ({
    emailIdx: index('auth_tokens_email_idx').on(t.email),
    expiresIdx: index('auth_tokens_expires_idx').on(t.expiresAt),
  }),
);

/* ---------- tickets ---------- */

export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
    number: text('number').notNull().unique(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id),
    subject: text('subject').notNull(),
    status: ticketStatusEnum('status').notNull().default('open'),
    priority: ticketPriorityEnum('priority').notNull().default('normal'),
    category: text('category').notNull().default('other'),
    assignedAgentId: integer('assigned_agent_id').references(() => agents.id),
    aiHandledInitial: boolean('ai_handled_initial').notNull().default(false),
    escalationReason: text('escalation_reason'),
    sourceConversationId: integer('source_conversation_id'),
    campusId: integer('campus_id'),
    firstResponseAt: timestamp('first_response_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    csatScore: integer('csat_score'),
    csatComment: text('csat_comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    studentIdx: index('tickets_student_idx').on(t.studentId),
    statusIdx: index('tickets_status_idx').on(t.status),
    assignedIdx: index('tickets_assigned_idx').on(t.assignedAgentId),
    campusIdx: index('tickets_campus_idx').on(t.campusId),
  }),
);

/* ---------- ticket messages ---------- */

export const ticketMessages = pgTable(
  'ticket_messages',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorType: messageAuthorEnum('author_type').notNull(),
    authorId: integer('author_id'),
    bodyMd: text('body_md').notNull(),
    attachments: jsonb('attachments').notNull().default(sql`'[]'::jsonb`),
    internalNote: boolean('internal_note').notNull().default(false),
    aiConfidence: real('ai_confidence'),
    aiToolsUsed: jsonb('ai_tools_used'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index('ticket_messages_ticket_idx').on(t.ticketId),
  }),
);

/* ---------- KB articles ---------- */

export const kbArticles = pgTable(
  'kb_articles',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    contentMd: text('content_md').notNull(),
    summary: text('summary'),
    category: text('category').notNull(),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    brand: brandEnum('brand').notNull().default('mcg'),
    visibility: visibilityEnum('visibility').notNull().default('authenticated'),
    campusScope: integer('campus_scope').array(),
    programScope: integer('program_scope').array(),
    ownerAgentId: integer('owner_agent_id').references(() => agents.id),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    nextReviewDue: timestamp('next_review_due', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    published: boolean('published').notNull().default(false),
    contentHash: text('content_hash'),
    viewCount: integer('view_count').notNull().default(0),
    helpfulCount: integer('helpful_count').notNull().default(0),
    notHelpfulCount: integer('not_helpful_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('kb_articles_slug_idx').on(t.slug),
    categoryIdx: index('kb_articles_category_idx').on(t.category),
    publishedIdx: index('kb_articles_published_idx').on(t.published),
  }),
);

export const kbArticleVersions = pgTable(
  'kb_article_versions',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .notNull()
      .references(() => kbArticles.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    contentMd: text('content_md').notNull(),
    editedBy: integer('edited_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    articleVersionIdx: uniqueIndex('kb_article_versions_a_v_idx').on(t.articleId, t.version),
  }),
);

/* ---------- KB embeddings (pgvector) ---------- */

export const kbEmbeddings = pgTable(
  'kb_embeddings',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .notNull()
      .references(() => kbArticles.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    chunkText: text('chunk_text').notNull(),
    embedding: vector(1536).notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (t) => ({
    articleChunkIdx: uniqueIndex('kb_embeddings_a_c_idx').on(t.articleId, t.chunkIndex),
  }),
);

/* ---------- AI conversations ---------- */

export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id').references(() => students.id),
    sessionId: text('session_id'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    resolvedByAi: boolean('resolved_by_ai').notNull().default(false),
    convertedToTicketId: integer('converted_to_ticket_id').references(() => tickets.id),
    satisfaction: satisfactionEnum('satisfaction'),
    totalTokensIn: integer('total_tokens_in').notNull().default(0),
    totalTokensOut: integer('total_tokens_out').notNull().default(0),
    costCents: integer('cost_cents').notNull().default(0),
  },
  (t) => ({
    studentIdx: index('ai_convos_student_idx').on(t.studentId),
  }),
);

export const aiMessages = pgTable(
  'ai_messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: aiMessageRoleEnum('role').notNull(),
    content: jsonb('content').notNull(),
    toolsCalled: jsonb('tools_called'),
    confidence: real('confidence'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationIdx: index('ai_messages_convo_idx').on(t.conversationId),
  }),
);

/* ---------- audit log (append-only) ---------- */

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorType: auditActorEnum('actor_type').notNull(),
    actorId: integer('actor_id'),
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    payload: jsonb('payload'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index('audit_created_idx').on(t.createdAt),
    actorIdx: index('audit_actor_idx').on(t.actorType, t.actorId),
    actionIdx: index('audit_action_idx').on(t.action),
  }),
);

/* ---------- settings cache (CampusLogin/Moodle reference data) ---------- */

export const settingsCache = pgTable('settings_cache', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- rate limit buckets ---------- */

export const rateLimitBuckets = pgTable('rate_limit_buckets', {
  key: text('key').primaryKey(),
  tokens: real('tokens').notNull(),
  lastRefill: timestamp('last_refill', { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- inferred types ---------- */

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type KbArticle = typeof kbArticles.$inferSelect;
export type NewKbArticle = typeof kbArticles.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
