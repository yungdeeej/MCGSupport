# MCG Student Support Portal — Build Specification

> **Drop-in prompt for Claude Code on Replit.** Paste this entire file as the initial brief. Every section is load-bearing — do not skip.

---

## 0. ROLE & OPERATING PRINCIPLES

You are the **lead engineer** building a production-grade AI-first student support portal for **MCG Career College**, a Canadian private career college with campuses in Calgary, Red Deer, Cold Lake, and Edmonton (Alberta). This will be used by real students and real advisors. Treat compliance (PIPEDA, Alberta private career college regulations) and data security as first-class requirements — not afterthoughts.

**Operating rules:**

1. **Ask before assuming.** If a spec is ambiguous, ask. Especially around CampusLogin endpoint behavior, Moodle plugin availability, and ticket SLA targets.
2. **Explain tradeoffs in one sentence** when you make a non-obvious technical decision.
3. **Default to boring, proven tech.** No experimental libraries. No clever abstractions before they're needed.
4. **Type everything.** End-to-end TypeScript with `strict: true`. No `any` without justification in a comment.
5. **Test the critical paths.** Auth, AI tool use, ticket escalation, and audit logging must have tests before they ship.
6. **Write code as if Troy (Dean) or a PIPEDA auditor might read it tomorrow.** Comments where non-obvious. Clean commits. Conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`).
7. **Build in vertical slices.** End-to-end feature, then next feature — not horizontal layers.
8. **Stop and confirm** at each phase gate (defined in Section 15) before moving on.
9. **Never log raw PII** — student names, emails, IDs go through the redaction helper before hitting logs.
10. **Every external API call** is wrapped in retry-with-backoff + circuit breaker + Zod response validation.

---

## 1. PRODUCT OVERVIEW

A **standalone support destination** at `support.mcgcollege.com` (not a chat widget). Three integrated modes in one polished interface:

1. **Search** — public + authenticated KB articles, hybrid semantic + keyword search
2. **AI Assistant** — conversational support grounded in the student's real-time data (schedule, enrollment, grades, attendance, profile) via Claude tool use. Finance-related queries escalate to human (not in API scope per DJ).
3. **Tickets** — when AI can't resolve, escalates to a human advisor with full AI conversation context and suggested replies

A separate **internal agent inbox** at `/admin` (role-guarded, not a separate subdomain in MVP) is used by MCG advisors to handle escalated tickets, review AI suggestions, and manage the KB.

### Approved UI Layout (student-facing home)

```
support.mcgcollege.com                          [Login]

   How can we help, Priya?
   ┌──────────────────────────────────────┐
   │ 🔍 Search or ask anything...         │
   └──────────────────────────────────────┘

   ╔═══════════════════════════════════════╗
   ║  💬 Ask MCG Assistant                  ║
   ║  Get instant answers about your        ║
   ║  classes, schedule, Moodle, and more   ║
   ╚═══════════════════════════════════════╝

   Popular Topics
   [Moodle] [Schedule] [Payments] [Account]

   My Tickets (2 open)              [View all →]
   #1247  Can't access BUS-201      In Progress
   #1244  Tuition payment plan      Awaiting reply
```

---

## 2. BRAND & DESIGN SYSTEM

This must look like a **top-tier institutional product** — polished, warm, trustworthy. Not a generic SaaS template, not over-designed. Students should feel like MCG invested in them.

### Colors (MCG brand)

- **Primary (orange):** `#fa991d` — CTAs, active states, key highlights, brand accents
- **Secondary (blue):** `#2c79a8` — links, info states, secondary buttons, headings
- **Neutrals:** Tailwind `slate` scale (50–950)
- **Semantic:** success `#16a34a`, warning `#f59e0b`, danger `#dc2626`

**80/15/5 rule:** 80% neutrals, 15% blue, 5% orange. Orange is for emphasis, not decoration. **Do not** use orange/blue gradients — looks dated.

Generate full 50–900 scales for both brand colors using a proper tool (uicolors.app). Don't eyeball. Commit the values in `tailwind.config.ts`:

```ts
colors: {
  brand: {
    50:  '#fff7ec',
    100: '#ffedd0',
    200: '#ffd79f',
    300: '#ffba5f',
    400: '#ff921e',
    500: '#fa991d', // PRIMARY
    600: '#e07208',
    700: '#b85309',
    800: '#94400f',
    900: '#7a3610',
    950: '#451a05',
  },
  ink: {
    50:  '#f1f8fc',
    100: '#e0eef7',
    200: '#c8e0ef',
    300: '#a1c9e2',
    400: '#73aacf',
    500: '#528dbb',
    600: '#2c79a8', // SECONDARY
    700: '#345d83',
    800: '#304f6c',
    900: '#2c435a',
    950: '#1d2c3c',
  },
}
```
*(Regenerate these values yourself with uicolors.app — these are starter approximations.)*

### Typography

- **Sans:** Inter via `next/font/google` (variable weight, swap, subset latin)
- **Display:** Inter 600–700, tight tracking (`-0.02em`)
- **Body:** Inter 400, `leading-relaxed`
- **Mono:** JetBrains Mono via `next/font/google` (ticket IDs, timestamps, code blocks)

### Component library

**shadcn/ui** (Radix primitives + Tailwind). Install only what's used. Theme via CSS variables in `globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 217 30% 18%;
    --primary: 30 96% 54%;        /* #fa991d in HSL */
    --primary-foreground: 0 0% 100%;
    --secondary: 204 59% 41%;     /* #2c79a8 in HSL */
    --secondary-foreground: 0 0% 100%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
    --ring: 30 96% 54%;
    /* ... etc */
  }
  .dark { /* dark mode tokens */ }
}
```

### Motion

- **Framer Motion** for purposeful animation: chat message arrivals, ticket status changes, accordion expansions, page transitions
- 150–250ms, ease-out, never block interaction
- Respect `prefers-reduced-motion`
- No hero animations, no parallax, no attention-seeking motion

### Iconography

- **lucide-react** only (consistent stroke weight, MIT licensed)
- Custom SVGs for the MCG mark in the header

### Layout primitives

- Cards: `rounded-xl`, `shadow-sm`, `border border-slate-200`, `shadow-md` on hover
- Inputs/buttons: `rounded-lg`
- Pills/avatars: `rounded-full`
- Generous whitespace: `space-y-6` / `space-y-8` defaults between sections
- Container: `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8` for content pages

### Dark mode

Supported. System-preference default, user-toggleable via header switch, stored in cookie (so SSR matches). Test every component in both modes.

### Accessibility — non-negotiable

- **WCAG 2.1 AA minimum**
- All interactive elements keyboard-navigable (Tab, Enter, Esc, Arrow keys for menus)
- Visible focus rings: `focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2`
- Color contrast ≥ 4.5:1 body text, ≥ 3:1 large text
- All form fields labeled, errors linked via `aria-describedby`
- `aria-live="polite"` for AI streaming responses
- Skip-to-content link on every page
- Test with axe DevTools before each phase gate

### Empty states & errors

**Every empty state** has: illustration/icon → one-line explanation → primary action.
**Every error state** has: what happened (plain language) → what to do next → way out (retry / go back / contact human).

---

## 3. TECH STACK (FIXED — DO NOT SUBSTITUTE)

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14+ App Router, TypeScript strict | SSR + RSC + API routes in one |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion | Speed, polish, a11y baked in |
| Database | Replit-hosted PostgreSQL + `pgvector` | Single store for relational + embeddings |
| ORM | Drizzle ORM + Drizzle Kit | Type-safe, fast, pgvector-friendly |
| Auth | Custom magic-link + session cookies | Owns the security story (Section 5) |
| AI | `@anthropic-ai/sdk`, model `claude-sonnet-4-5` | Tool use + long context |
| Embeddings | OpenAI `text-embedding-3-small` (1536d) | Cheap, strong quality |
| Validation | Zod | Every API boundary, every LLM output |
| HTTP | Native `fetch` + `p-retry` wrapper | No bloat |
| Email | Resend | Magic links + ticket notifications |
| Logging | Pino → structured JSON | Greppable, redaction-friendly |
| Error tracking | Sentry | Free tier OK for MVP |
| Jobs | `node-cron` for KB sync + Moodle pull | No Redis dependency yet |
| Hosting | Replit Deployments (Reserved VM) | Always-on, predictable cost |
| File storage | Replit Object Storage | Ticket attachments |
| Testing | Vitest (unit) + Playwright (E2E for auth + ticket flow) | Only critical paths |
| Rate limiting | `@upstash/ratelimit` with in-memory adapter | Per-IP and per-user |

**Do not** introduce additional services without explicit approval. No Redis, no separate Express server, no Supabase, no Clerk, no NextAuth — unless I (DJ) approve it after you explain why the default stack can't do the job.

---

## 4. INTEGRATIONS

### 4.1 CampusLogin API ✅ Spec provided

- **Base URL:** `https://connectorapi.campuslogin.com`
- **Auth:** `X-Api-Key` header (server-to-server). Stored in `CAMPUSLOGIN_API_KEY` env var. **Never exposed to the browser.** All CampusLogin calls go through our backend.
- **Spec:** OpenAPI 3.0 generated by NSwag (`swagger.json` in `/docs`). 91 endpoints across 17 tags.
- **First task:** Generate a typed client using `openapi-typescript` from the swagger.json. Wrap it in `lib/campuslogin/client.ts` with retry + Zod validation + Pino logging (redacted).

**Endpoints we actually use (MVP):**

| Purpose | Endpoint |
|---|---|
| Get student record | `GET /api/Students/{id}` → `GetStudentResponse` |
| List students (search/filter) | `POST /api/Students/Students` |
| Get contact profile (rich view) | `GET /api/ContactSheet/ContactProfile/{maillistId}/{contactId}` |
| Get contact communications | `GET /api/ContactSheet/ContactCommunications/{mailListId}/{contactId}` |
| Get program profiles for student | `GET /api/Leads/ProgramProfiles/{contactId}` |
| Get student's appointments | `GET /api/Appointments/ContactAppointments/{maillistId}/{contactId}` |
| Get student's documents | `GET /api/Documents/ContactDocuments/{mailListId}/{contactId}` |
| Get student's notes | `GET /api/Notes/ContactNotes/{mailListId}/{contactId}` |
| Get student's messages | `GET /api/Messages/ContactMessages/{mailListId}/{contactId}` |
| Get student's emails (history) | `GET /api/Emails/ContactEmails/{mailListId}/{contactId}` |
| Get student's phone calls | `GET /api/PhoneCalls/ContactPhoneCalls/{mailListId}/{contactId}` |
| Settings: programs | `GET /api/Settings/SchoolPrograms` |
| Settings: campuses | `GET /api/Settings/Campuses` |
| Settings: admission stages | `GET /api/Settings/AdmissionStages` |
| Settings: schools | `GET /api/Settings/Schools` |
| Add note to student | `POST /api/Notes/AddNewNote` |

**Key shape — `GetStudentResponse`:**
```
id, guid, leadId, schoolId, campusId, programId, staffId, addmissionId,
firstName, lastName, email, telephone, alternatePhone,
createDate, leadDate,
commonFields[], customFields[], attributeFields[], stageFields[]
```

The `*Fields` arrays are extensible — finance data, custom intake answers, etc. likely live here. **Inspect the actual response payload** for a real student early on and document which fields contain what.

**⚠️ Finance data confirmed out of scope for MVP.** DJ confirmed: tuition/finance data exists in CampusLogin but is **not exposed via the API**. Finance-related questions (tuition balance, payment plans, refunds) are **always escalated to a human**. AI must recognize these intents and offer ticket creation — never speculate on numbers.

**⚠️ No student-facing auth in this API.** It authenticates *us* (the application), not the student. Student auth is our problem to solve (Section 5).

**Caching:** Settings endpoints (programs, campuses, etc.) are nearly static — cache 24h in Postgres with a nightly refresh cron. Student records — cache 5 minutes per student, invalidate on note add.

### 4.2 Moodle Web Services API ✅ Confirmed

- **Moodle instance:** `https://mcgcollege.lingellearning.ca` (hosted by **Lingel Learning**, a Moodle Certified Partner — standard Moodle, no custom auth layer)
- **REST endpoint:** `https://mcgcollege.lingellearning.ca/webservice/rest/server.php`
- **Login flow for students (independent of API):** standard `/login/index.php` with built-in forgot-password at `/login/forgot_password.php` — we'll deep-link to these from KB articles
- **Auth (for our integration):** Per-token. **DJ needs to coordinate with Lingel Learning support** to:
  1. Enable Web Services (`Site administration → Advanced features → Enable web services`)
  2. Enable the REST protocol
  3. Create a dedicated **"MCG Support Portal" external service** with only the functions in the table below enabled
  4. Create a dedicated service account user with a restricted role (read-mostly, no admin)
  5. Generate a token bound to that service + user → store in `MOODLE_API_TOKEN`
- **Lingel is hosted Moodle**, so plugin installs (like `mod_attendance`) require a support ticket to them — not something we can install ourselves. Confirm with Lingel whether `mod_attendance` is already enabled before building the attendance tool.

**Required Moodle Web Service functions (enable these in Site Admin → Plugins → Web services → External services):**

| Purpose | Function |
|---|---|
| Verify our connection | `core_webservice_get_site_info` |
| Find Moodle user by email | `core_user_get_users_by_field` |
| Get user's enrolled courses | `core_enrol_get_users_courses` |
| Get course contents | `core_course_get_contents` |
| Get user's grades for a course | `gradereport_user_get_grade_items` |
| Get upcoming calendar events for user | `core_calendar_get_calendar_events` |
| Get user's last access info | `core_user_get_users` |
| Trigger password reset email | `core_auth_request_password_reset` |

**Attendance:** Moodle's stock API does **not** expose attendance. Requires the `mod_attendance` plugin (Dan Marsden's plugin). Since Lingel hosts the instance, **DJ needs to ask Lingel support whether this plugin is installed and request enablement if not.** If installed, these functions become available:
- `mod_attendance_get_sessions` — list sessions for a course
- `mod_attendance_get_session` — details for one session, including statuses

If Lingel won't enable it on the hosted instance, we drop the `get_my_attendance` AI tool from MVP and direct attendance questions to the academic team.

**Action item for DJ before Phase 5:**
1. Open a Lingel Learning support ticket requesting:
   - Web services + REST protocol enabled
   - Custom external service "MCG Support Portal" with the 8 functions in the table above
   - `mod_attendance` plugin confirmed/enabled (if not already)
   - `core_auth_request_password_reset` permission granted on the service account
   - Dedicated service account + scoped token issued
2. Document the timeline — hosted Moodle changes can take 2–5 business days. Plan Phase 5 accordingly.

All Moodle calls go through `lib/moodle/client.ts` — same pattern as CampusLogin (typed, validated, retried, redacted).

### 4.3 Anthropic Claude

- Model: `claude-sonnet-4-5`
- Streaming responses to the chat UI via SSE
- Tool use (function calling) for all dynamic student data — see Section 7
- System prompt versioned in `lib/ai/prompts/` — never hardcoded in route handlers
- API key in `ANTHROPIC_API_KEY`, never exposed to browser
- Token + cost logging per conversation in `ai_messages` table

### 4.4 OpenAI Embeddings

- `text-embedding-3-small`, 1536 dimensions
- Used for: KB article chunks, ticket subjects (for similar-ticket lookup), past AI conversation summaries
- API key in `OPENAI_API_KEY`

### 4.5 Resend (transactional email)

- Magic-link auth emails
- Ticket notifications (new reply, status change, resolution)
- **Domain:** `support.mcgcollege.com` with DKIM/SPF/DMARC verified
- API key in `RESEND_API_KEY`

---

## 5. AUTHENTICATION & AUTHORIZATION

This is the **highest-stakes part** of the build. Student records are protected under PIPEDA. Get this wrong and we have a breach.

### 5.1 Identity model

Two roles:
- **`student`** — can view their own data, create/view their own tickets, chat with AI
- **`agent`** — MCG staff. Can view all tickets, post replies, escalate, manage KB. Subroles: `agent`, `admin` (only admins manage KB and user roles).

### 5.2 Student auth flow (magic link + verification)

Students do **not** sign up. They are pre-provisioned by syncing from CampusLogin.

**Provisioning:**
- Nightly cron pulls all active students from CampusLogin (`/api/Students/Students` with filter for active admission status)
- Creates/updates a row in our `students` table keyed by `campuslogin_id`
- Stores email, name, programId, campusId, mailListId, contactId

**Login flow:**
1. Student enters email on `/login`
2. We look them up in our `students` table (NOT CampusLogin directly — slower, leakier)
3. If found AND active: send a magic link via Resend (one-time token, 15-min expiry, single-use, stored hashed in `auth_tokens`)
4. If not found: **return the same response as success** ("If your email matches a student record, you'll receive a login link"). Never confirm/deny existence.
5. Student clicks link → token validated → session cookie set
6. **Optional second factor for sensitive actions:** before showing financial data or triggering password resets, require a re-auth (re-send magic link or check 2FA code). Configurable per action.

**Session:**
- Cookie: `mcg_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, 7-day rolling expiry
- Server-side session store in Postgres (`sessions` table). Token in cookie is opaque random; lookup happens server-side. **No JWT.** (Easier to revoke, no key rotation pain.)
- Session row stores: `user_id`, `user_type`, `created_at`, `expires_at`, `ip`, `user_agent`, `last_active_at`
- Session revocation: deleting the row instantly kills the session

**Rate limiting (per IP and per email):**
- 5 magic-link requests per email per hour
- 20 magic-link requests per IP per hour
- 10 login attempts per IP per minute

### 5.3 Agent auth flow

- Agents are provisioned manually by an admin (no self-signup)
- Same magic-link mechanism but separate `agents` table
- Stronger 2FA: TOTP required for all agents (use `otplib` + QR code at first login)
- Admin role gated by separate check, not derivable from session

**MVP agent seed (DJ-confirmed):**
- One agent: `dj.gupta@mcgcollege.com`, role: `admin`, campus_ids: `[all]`
- Note on email domains: MCG previously operated as NIMT — `nimt.ca` addresses still exist and are masked/forwarded to `mcgcollege.com`. Resend domain verification must cover `mcgcollege.com` for transactional sends. Internal `nimt.ca` aliasing happens at the email server level, not ours.

### 5.4 Authorization (row-level enforcement)

**Every API route** that returns student data goes through a single helper:

```ts
// lib/auth/requireOwnership.ts
export async function requireStudentOwnership(req, studentId: number) {
  const session = await getSession(req);
  if (!session) throw new UnauthorizedError();
  if (session.userType === 'student' && session.userId !== studentId) {
    // Student trying to access someone else's data → log and reject
    await auditLog.security('IDOR_ATTEMPT', { ... });
    throw new ForbiddenError();
  }
  if (session.userType === 'agent') return session; // agents can read all
  return session;
}
```

**Never** trust a `studentId` from the request body or URL. Always derive from session on first lookup, and double-check ownership on every nested fetch.

### 5.5 AI tool use — identity propagation

When the AI agent calls a tool like `get_student_schedule`, the tool handler **does not accept a `studentId` parameter**. The session is injected from the route handler. The AI literally cannot ask for another student's data because the parameter doesn't exist in the tool schema.

This is the single most important security control in the build. **Never** expose `studentId` to the model.

### 5.6 Audit logging

Every sensitive action writes to `audit_log`:
- Login (success + fail)
- Session created/destroyed
- AI tool call (with sanitized inputs/outputs)
- Ticket created/replied/closed
- Agent viewed student record
- KB article edited
- Permission denied
- IDOR attempt

Audit log is **append-only** at the application layer (no UPDATE/DELETE routes). Retain 7 years per Alberta records guidance.

---

## 6. DATABASE SCHEMA (PostgreSQL + pgvector)

Use Drizzle. Migrations live in `drizzle/migrations`. Enable extensions in the first migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for keyword search
CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive email
```

### Tables (Drizzle schema sketch — translate to real Drizzle syntax)

```ts
// students (synced from CampusLogin)
students {
  id: serial PK
  campuslogin_id: int UNIQUE NOT NULL
  campuslogin_guid: uuid
  lead_id: int
  mail_list_id: int
  contact_id: int
  email: citext UNIQUE NOT NULL
  first_name, last_name: text
  school_id, campus_id, program_id: int
  staff_id: int  // assigned advisor
  admission_status_id: int
  status: enum('active','inactive','graduated','withdrawn')
  raw_payload: jsonb  // full last-synced CampusLogin response
  last_synced_at: timestamptz
  created_at, updated_at: timestamptz
}

// agents (MCG staff)
agents {
  id: serial PK
  email: citext UNIQUE
  name: text
  role: enum('agent','admin')
  campus_ids: int[]  // which campuses they handle
  totp_secret: text  // encrypted
  totp_enabled: boolean
  active: boolean
  created_at: timestamptz
}

// sessions (server-side)
sessions {
  id: text PK  // opaque random
  user_id: int NOT NULL
  user_type: enum('student','agent')
  ip: inet
  user_agent: text
  created_at, last_active_at, expires_at: timestamptz
}

// auth_tokens (magic links)
auth_tokens {
  id: serial PK
  email: citext NOT NULL
  token_hash: text NOT NULL  // SHA-256 of the token
  purpose: enum('login','reauth')
  user_type: enum('student','agent')
  expires_at: timestamptz
  used_at: timestamptz
  created_at: timestamptz
  ip: inet
}

// tickets
tickets {
  id: serial PK
  number: text UNIQUE NOT NULL  // human-readable: MCG-1247
  student_id: int FK NOT NULL
  subject: text NOT NULL
  status: enum('open','in_progress','awaiting_student','resolved','closed')
  priority: enum('low','normal','high','urgent')
  category: text  // moodle, schedule, payments, account, academic, other
  assigned_agent_id: int FK
  ai_handled_initial: boolean  // did AI deflect this before human got involved?
  escalation_reason: text  // null if not escalated
  source_conversation_id: int FK  // link to ai_conversations
  campus_id: int  // for routing
  first_response_at: timestamptz
  resolved_at: timestamptz
  csat_score: int  // 1-5
  csat_comment: text
  created_at, updated_at: timestamptz
}

// ticket_messages
ticket_messages {
  id: serial PK
  ticket_id: int FK NOT NULL
  author_type: enum('student','ai','agent','system')
  author_id: int  // null for ai/system
  body_md: text NOT NULL
  attachments: jsonb  // [{filename, size, storage_key, mime}]
  internal_note: boolean DEFAULT false  // agent-only notes
  ai_confidence: real  // 0-1, null for human
  ai_tools_used: jsonb  // array of tool names called
  created_at: timestamptz
}

// kb_articles
kb_articles {
  id: serial PK
  slug: text UNIQUE NOT NULL
  title: text NOT NULL
  content_md: text NOT NULL
  category: text NOT NULL
  tags: text[]
  brand: enum('mcg','infocus','collegeadmissions') DEFAULT 'mcg'
  visibility: enum('public','authenticated')
  campus_scope: int[]  // null = all campuses
  program_scope: int[]  // null = all programs
  owner_agent_id: int FK
  last_reviewed_at: timestamptz
  next_review_due: timestamptz
  version: int DEFAULT 1
  published: boolean DEFAULT false
  created_at, updated_at: timestamptz
}

// kb_embeddings (pgvector)
kb_embeddings {
  id: serial PK
  article_id: int FK NOT NULL
  chunk_index: int NOT NULL
  chunk_text: text NOT NULL
  embedding: vector(1536) NOT NULL
  metadata: jsonb  // {section, title}
  UNIQUE(article_id, chunk_index)
}
CREATE INDEX ON kb_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON kb_embeddings USING gin (chunk_text gin_trgm_ops);

// ai_conversations
ai_conversations {
  id: serial PK
  student_id: int FK
  session_id: text FK
  started_at: timestamptz
  ended_at: timestamptz
  resolved_by_ai: boolean
  converted_to_ticket_id: int FK
  satisfaction: enum('helpful','not_helpful')
  total_tokens_in, total_tokens_out: int
  cost_cents: int
}

// ai_messages
ai_messages {
  id: serial PK
  conversation_id: int FK NOT NULL
  role: enum('user','assistant','tool_result')
  content: jsonb NOT NULL  // full message blocks (text + tool_use)
  tools_called: jsonb
  confidence: real
  tokens_in, tokens_out: int
  latency_ms: int
  created_at: timestamptz
}

// audit_log (append-only)
audit_log {
  id: bigserial PK
  actor_type: enum('student','agent','system','ai')
  actor_id: int
  action: text NOT NULL  // 'LOGIN_SUCCESS','TICKET_CREATED','TOOL_CALL_get_schedule', etc.
  resource_type: text
  resource_id: text
  payload: jsonb  // redacted
  ip: inet
  user_agent: text
  created_at: timestamptz DEFAULT now()
}
CREATE INDEX ON audit_log (created_at);
CREATE INDEX ON audit_log (actor_type, actor_id);
CREATE INDEX ON audit_log (action);

// rate_limit_buckets (if not using upstash external)
rate_limit_buckets {
  key: text PK
  tokens: real
  last_refill: timestamptz
}
```

Indexes beyond PKs: `students.email`, `tickets.student_id`, `tickets.status`, `tickets.assigned_agent_id`, `ticket_messages.ticket_id`, `kb_articles.slug`, `kb_articles.category`, `audit_log` indexes as shown.

---

## 7. AI ASSISTANT ARCHITECTURE

### 7.1 System prompt (versioned, stored in `lib/ai/prompts/student-assistant.v1.md`)

Outline:
- Identity: "You are MCG Assistant, a support AI for MCG Career College students."
- Tone: warm, concise, action-oriented. Plain language. Never robotic.
- Capabilities: schedule lookups, Moodle navigation, program info, attendance, account help
- **Hard limits:** never give immigration advice, never speculate on academic standing, never quote policy you can't verify in the KB
- **Escalation triggers** (must immediately offer human handoff): refund, withdraw, harassment, accommodation, mental health, IRCC/study permit, legal, complaint, discrimination, "speak to a manager"
- **Output rules:** answers in 2–5 sentences typically. Use bullets for lists. Always end with a way out ("Anything else? Or I can connect you with an advisor.")

### 7.2 Tools (function calling)

Every tool:
- Has a Zod schema for inputs and outputs
- Does **not** accept student identity as a parameter (always injected from session server-side)
- Logs to `audit_log` with action `TOOL_CALL_<name>`
- Returns structured data the model summarizes for the student

**MVP tool set:**

```ts
search_knowledge_base(query: string, category?: string) 
  → { results: [{title, snippet, slug, relevance}] }

get_my_profile() 
  → { firstName, lastName, program, campus, admissionStage, advisorName }

get_my_schedule(when?: 'today'|'tomorrow'|'this_week') 
  → { classes: [{course, time, instructor, room, moodleUrl}] }

get_my_courses() 
  → { courses: [{code, name, moodleUrl, instructor, nextDeadline}] }

get_my_grades(courseCode?: string) 
  → { grades: [{course, item, grade, weight, dueDate}] }
  ⚠ requires re-auth if accessed within X mins of session

get_my_attendance(courseCode?: string) 
  → { sessions: [{date, status, course}], summary: {present, absent, late, percent} }

get_my_appointments() 
  → { appointments: [{type, when, with, location, notes}] }

get_my_open_tickets() 
  → { tickets: [{number, subject, status, lastUpdate}] }

create_ticket(subject: string, category: string, description: string, priority?: string) 
  → { ticketNumber, url }
  ⚠ requires explicit user confirmation before calling

request_password_reset_help(system: 'moodle'|'campuslogin') 
  → { instructions: string[], deepLinkUrl: string }
  // DJ-confirmed: AI does NOT trigger the reset itself.
  // It returns step-by-step instructions + a deep link to the Moodle forgot-password page.
  // This avoids us holding the responsibility for password resets and keeps the audit trail in Moodle.
  // For Moodle: deepLinkUrl = https://mcgcollege.lingellearning.ca/login/forgot_password.php

escalate_to_human(reason: string, summary: string) 
  → { ticketNumber, estimatedResponseTime }
```

### 7.3 RAG flow

1. Embed user query (OpenAI `text-embedding-3-small`)
2. Hybrid search: top-5 vector + top-5 keyword (pg_trgm), reciprocal-rank-fusion merge
3. Filter by student's campus/program if metadata allows
4. Inject top-3 chunks into system prompt as `<knowledge_base>` block
5. Send to Claude with tools available
6. Stream response back via SSE
7. Log every message + tool call to DB

### 7.4 Confidence & escalation

Claude doesn't natively output confidence. We derive it:

- **High confidence:** ≥1 KB chunk above similarity threshold 0.78 AND no escalation keywords in user message AND no tool call returned "not found"
- **Medium confidence:** KB chunks 0.65–0.78, OR partial tool data
- **Low confidence:** No KB hits, OR user message contains escalation keyword, OR tool returned error

UI surfaces this:
- High: AI answers, shows "👍 Helpful / 👎 Not helpful / Talk to a human"
- Medium: AI answers with "Was this helpful, or should I get an advisor?"
- Low: AI says "I'm not sure I can fully answer that. Let me connect you with an advisor." → suggests `create_ticket`

### 7.5 Streaming + UX

- SSE endpoint at `/api/ai/chat`
- Client-side: streaming text, tool-call indicators ("Checking your schedule..."), then result
- Show tool transparency — students see what the AI looked up. Builds trust.
- "Talk to a human" button always visible in the chat header

---

## 8. TICKETING SYSTEM

### 8.1 Lifecycle

```
draft → open → in_progress → awaiting_student ⇄ in_progress → resolved → closed
                    ↓
                escalated (sets priority=high, notifies agent)
```

### 8.2 Routing

**MVP (single helpdesk, per DJ):** All escalated tickets auto-assign to `dj.gupta@mcgcollege.com`. Skip the round-robin logic.

**v1.1+ (multi-agent):**
1. Categorize via Claude (cheap fast call: `claude-haiku-4-5`)
2. Determine campus from student record
3. Round-robin assign to agents in that campus's team, respecting `campus_ids` array
4. If no agent available, assign to a fallback team (admin role)

**SLA timer** starts when a ticket is created: first response within 4 business hours during 9–5 MT, 8 business hours otherwise. (Even with single helpdesk — DJ should see the timer to triage.)

### 8.3 Notifications

- Student: email on agent reply, status change to resolved
- Agent: email + (future) Slack ping on new assignment, on student reply

### 8.4 CSAT

After `resolved` status, email student 4 hours later with 1-click rating (5 emoji scale). Score stored on ticket, used for AI deflection quality metrics.

### 8.5 Agent inbox features (MVP)

- Inbox list with filters: status, assigned-to-me, campus, category, age
- Ticket detail view with full conversation (AI + student + agent messages threaded chronologically)
- **AI-suggested reply** for every incoming student message (one-click insert + edit before send)
- Internal notes (not visible to student)
- Attach KB article to reply (auto-formats link)
- Bulk actions: assign, change status, change priority
- Search by ticket number, student name, content

---

## 9. KNOWLEDGE BASE

### 9.1 Authoring

- Admin/agent role can create/edit articles in `/admin/kb`
- Markdown editor with live preview (use `@uiw/react-md-editor`)
- Required fields: title, category, visibility, owner, review date
- Versioning: each save creates a new row in `kb_article_versions`
- "Last reviewed" badge on public articles older than 6 months for admins

### 9.2 Chunking & embedding

- On article save: chunk by markdown headings, 500–800 tokens per chunk, 50-token overlap
- Embed each chunk via OpenAI
- Upsert into `kb_embeddings`
- Mark stale embeddings if article content hash changes

### 9.3 Seed content (Phase 1 priorities)

Have the AI draft stub articles in these categories — then humans review:
- **Moodle access:**
  - "How to reset your Moodle password" — **must include step-by-step with screenshots** for `https://mcgcollege.lingellearning.ca/login/forgot_password.php` (DJ confirmed: students self-serve this)
  - Logging in for the first time
  - Finding your courses
  - Joining live classes
  - Submitting assignments
  - Viewing grades
  - Using the Moodle mobile app
- **Schedule:** how to find your timetable, time zones (all MCG = Mountain Time), class cancellation policy, joining virtual classes
- **Payments:** payment plan options, where to pay, late fee policy, T2202 timing, StudentAid Alberta basics. **Note:** AI cannot access live tuition balance (finance data not in API scope). All "what do I owe?" questions escalate to human via ticket. KB articles cover process and policy only — never specific amounts.
- **Account:** name change, email update, transcript request, withdrawal process (links to advisor — AI doesn't handle)
- **Campus:** hours, addresses, parking, who to contact (per campus: Calgary, Red Deer, Cold Lake, Edmonton)

**Password reset article — special handling:**
This is the #1 highest-volume support request at any college. The article should be:
- Clearly written in plain language
- With screenshots of each step
- Linked from the AI's `request_password_reset` tool response
- Linked from the public homepage as "Forgot your password?"
- Available without authentication (visibility: `public`)

---

## 10. ENVIRONMENT & SECRETS

`.env.local` (never committed) with these keys:

```
DATABASE_URL=postgres://...
CAMPUSLOGIN_API_KEY=...
CAMPUSLOGIN_BASE_URL=https://connectorapi.campuslogin.com
CAMPUSLOGIN_ORG_ID=900
CAMPUSLOGIN_STUDENT_MAILLIST_ID=         # TBD — see Section 19 #2
MOODLE_BASE_URL=https://mcgcollege.lingellearning.ca
MOODLE_API_TOKEN=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
RESEND_API_KEY=...
SENTRY_DSN=...
APP_URL=https://support.mcgcollege.com
SESSION_SECRET=... (32+ random bytes, used for signing session IDs)
ENCRYPTION_KEY=... (32 bytes, AES-256 for TOTP secrets etc.)
SUPPORT_HELPDESK_EMAIL=dj.gupta@mcgcollege.com
NODE_ENV=production
```

Use Replit Secrets (not committed files). Add `.env.example` with empty values + comments.

---

## 11. OBSERVABILITY

### 11.1 Logging

- Pino logger, JSON output, with request ID middleware (`x-request-id`)
- **Redact** these fields automatically: `email`, `firstName`, `lastName`, `telephone`, `password`, `token`, `secret`, `apiKey`, `authorization` — log a hash instead
- Log levels: `error` (paging-worthy), `warn` (anomaly), `info` (state change), `debug` (verbose, off in prod)

### 11.2 Metrics

Track in a `metrics` table or via Sentry:
- AI deflection rate (resolved-by-ai / total conversations)
- First response time (median, p95)
- Resolution time
- CSAT (avg, distribution)
- AI cost per conversation
- Tool call success rate per tool
- Login success/fail rate
- IDOR attempts (should be zero)

### 11.3 Dashboards

Build a simple `/admin/metrics` page (Phase 4) with Recharts:
- Conversations per day
- Deflection rate trend
- Tickets by status, category, campus
- Agent workload
- Top KB articles by views and "not helpful" votes

---

## 12. SECURITY CHECKLIST (enforce all)

- [ ] HTTPS only (Replit handles this for `*.replit.app`; configure custom domain TLS)
- [ ] CSP header with strict policy (allow only self + anthropic + resend + sentry)
- [ ] `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Rate limiting on all auth endpoints + AI chat (cost protection)
- [ ] CSRF tokens for state-changing POST routes (or rely on SameSite + double-submit)
- [ ] All inputs Zod-validated at API boundary
- [ ] All outputs from CampusLogin/Moodle re-validated before passing to client
- [ ] Parameterized SQL only (Drizzle handles this; never raw concat)
- [ ] No `console.log` in production code (use Pino)
- [ ] Secrets never logged
- [ ] Dependencies scanned (`npm audit`) before each deploy
- [ ] Session cookie rotation on privilege change
- [ ] Account lockout after 10 failed magic-link sends (per email, 1 hour)
- [ ] Email enumeration prevented (same response for known/unknown emails)
- [ ] AI prompt injection defenses: system prompt clearly delineates user input as untrusted; tools never accept identity params; LLM cannot trigger destructive actions without explicit user confirmation in chat

---

## 13. COMPLIANCE (PIPEDA + Alberta)

- [ ] Privacy notice on first login: what we collect, why, retention, how to request access/deletion
- [ ] Data Processing Agreements with: Anthropic, OpenAI, Resend, Sentry
- [ ] Confirm Anthropic + OpenAI data residency / "no training on customer data" settings active
- [ ] Right to access: student can download all their data as JSON from `/account/data`
- [ ] Right to deletion: agents can hard-delete a student record after graduation + retention period (default 7 years)
- [ ] Audit log retention: 7 years
- [ ] Disclosure log: every time agent views a student record, logged
- [ ] Cookie consent banner (PIPEDA + provincial — Alberta doesn't have PIPA-private-sector but be safe)
- [ ] Terms + privacy policy linked in footer (placeholder URLs — DJ to provide final copy)

---

## 14. PROJECT STRUCTURE

```
/
├── app/
│   ├── (marketing)/              # public, no auth
│   │   ├── page.tsx              # homepage with search
│   │   └── kb/[slug]/page.tsx    # public KB articles
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── verify/page.tsx       # magic link landing
│   ├── (app)/                    # authenticated student area
│   │   ├── layout.tsx            # session check
│   │   ├── page.tsx              # student dashboard
│   │   ├── chat/page.tsx         # AI conversation
│   │   ├── tickets/
│   │   │   ├── page.tsx          # list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx     # detail
│   │   ├── account/page.tsx
│   │   └── kb/[slug]/page.tsx    # authenticated KB
│   ├── admin/                    # agent + admin
│   │   ├── layout.tsx            # role check
│   │   ├── inbox/page.tsx
│   │   ├── tickets/[id]/page.tsx
│   │   ├── kb/page.tsx
│   │   ├── kb/[id]/edit/page.tsx
│   │   ├── users/page.tsx        # admin only
│   │   └── metrics/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── request-link/route.ts
│       │   ├── verify/route.ts
│       │   └── logout/route.ts
│       ├── ai/
│       │   └── chat/route.ts     # SSE streaming
│       ├── tickets/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── messages/route.ts
│       ├── kb/
│       │   ├── search/route.ts
│       │   └── route.ts
│       └── webhooks/
│           └── campuslogin/route.ts  # if they support webhooks
├── lib/
│   ├── ai/
│   │   ├── client.ts             # Anthropic SDK wrapper
│   │   ├── tools/                # one file per tool
│   │   ├── prompts/
│   │   │   └── student-assistant.v1.md
│   │   ├── rag.ts
│   │   └── confidence.ts
│   ├── auth/
│   │   ├── session.ts
│   │   ├── magicLink.ts
│   │   ├── totp.ts
│   │   └── requireOwnership.ts
│   ├── campuslogin/
│   │   ├── client.ts
│   │   ├── types.ts              # generated from swagger
│   │   └── sync.ts               # nightly sync logic
│   ├── moodle/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema
│   │   ├── index.ts              # client singleton
│   │   └── helpers.ts
│   ├── kb/
│   │   ├── chunker.ts
│   │   ├── embedder.ts
│   │   └── search.ts
│   ├── tickets/
│   │   ├── routing.ts
│   │   ├── notifications.ts
│   │   └── csat.ts
│   ├── audit.ts
│   ├── ratelimit.ts
│   ├── logger.ts
│   ├── email.ts                  # Resend wrapper
│   └── env.ts                    # Zod-validated env vars
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── chat/
│   ├── tickets/
│   ├── kb/
│   ├── auth/
│   └── layout/
├── drizzle/
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── swagger.json              # CampusLogin spec
│   ├── ARCHITECTURE.md
│   ├── RUNBOOK.md                # how to deploy, rotate keys, recover
│   └── DECISIONS.md               # ADRs
├── public/
├── .env.example
├── tailwind.config.ts
├── drizzle.config.ts
├── next.config.mjs
└── package.json
```

---

## 15. PHASED BUILD PLAN (with gates)

Each phase ends with a **demo + gate**. Stop after each phase and confirm with DJ before proceeding.

### Phase 1: Foundation (Week 1)
- Next.js + Tailwind + shadcn scaffolding with MCG branding
- Drizzle + Postgres + pgvector setup, first migration
- Env var validation with Zod
- Pino logger with redaction
- Sentry wired up
- Basic layout: header, footer, dark mode toggle, login page (UI only)
- **Gate:** site loads at MCG-branded "Coming Soon" with login button (no auth yet)

### Phase 2: Auth + Student Sync (Week 2)
- CampusLogin typed client generated from swagger
- Nightly cron pulling students into `students` table
- Magic-link auth flow end-to-end
- Session middleware + ownership helper
- Student account page showing their own profile
- Audit logging foundation
- **Gate:** DJ can log in as a real student account and see their CampusLogin-sourced profile

### Phase 3: KB + Search (Week 3)
- KB schema + chunker + embedder
- Public KB browse + read pages
- Hybrid search API (vector + pg_trgm)
- Seed 25 articles across top categories
- Search UI on homepage
- **Gate:** Search returns relevant articles, KB pages indexable by Google for public articles

### Phase 4: AI Assistant (Weeks 4–5)
- Anthropic client + streaming SSE
- Chat UI with tool-call transparency
- Tools: `search_knowledge_base`, `get_my_profile`, `get_my_open_tickets` (no Moodle yet)
- RAG flow + confidence calc
- Conversation persistence
- **Gate:** Student can ask "What program am I in?" and "How do I reset my Moodle password?" and get correct, grounded answers

### Phase 5: Moodle Integration + Full Tool Set (Weeks 6–7)
- Moodle client + the 8 required functions
- Tools: `get_my_schedule`, `get_my_courses`, `get_my_grades`, `get_my_attendance`
- Re-auth flow for sensitive tools
- Escalation keyword detection
- **Gate:** Student can ask "What's my schedule tomorrow?" and get accurate Moodle data; sensitive questions trigger re-auth

### Phase 6: Tickets (Weeks 8–9)
- Ticket schema + creation flow from AI ("create a ticket about this")
- Student ticket list + detail view
- Agent inbox (basic): list, detail, reply, status change, AI-suggested reply
- Email notifications via Resend
- Routing logic
- **Gate:** Student creates a ticket from AI chat; advisor receives email; advisor replies; student receives email; full thread visible

### Phase 7: Polish + Compliance (Weeks 10–11)
- CSAT flow
- KB admin UI
- Metrics dashboard
- Cookie banner, privacy notice, data export endpoint
- E2E tests for critical paths
- Accessibility audit pass
- Load test the AI endpoint (target: 50 concurrent conversations)
- **Gate:** External pentester or detailed self-review with checklist signed off

### Phase 8: Soft Launch (Week 12)
- Deploy to Replit with custom domain
- Invite 25–50 students for closed beta
- Monitor metrics daily
- Iterate KB based on AI "not helpful" votes
- **Gate:** AI deflection ≥ 30%, CSAT ≥ 4.0/5, zero security incidents

---

## 16. NON-FUNCTIONAL TARGETS

- **Page load (LCP):** < 2.0s on 4G
- **AI first token:** < 1.5s (use streaming)
- **Search response:** < 300ms p95
- **Uptime target:** 99.5% (Replit Reserved VM)
- **AI cost per conversation:** < CAD $0.05 average (Sonnet 4.5 with caching)
- **Lighthouse scores:** Perf > 90, A11y > 95, Best Practices > 95, SEO > 90 (public pages)

---

## 17. WHAT TO DO FIRST

Don't start writing app code yet. **First, execute these in order:**

1. **Confirm the stack** with me by repeating back any decisions you're unsure about.
2. **Review Section 19** — most questions are answered, but two still need DJ to email CampusLogin support (webhooks + mailListId) and one needs a Lingel ticket (Web Services + mod_attendance). Surface these to DJ as a single "do this week" list.
3. **Scaffold the repo** with the structure in Section 14, empty stubs, no logic.
4. **Set up the database** with all tables migrated.
5. **Generate the CampusLogin typed client** from `docs/swagger.json` and verify it compiles. Don't call the API yet — just type-check.
6. **Write the env var Zod schema** and verify the app refuses to start without all required keys.
7. **Stand up Phase 1 Gate** (branded coming-soon page).
8. **Then ask me for the green light** before moving to Phase 2.

---

## 18. FINALIZED CHECKLIST (master)

### Infrastructure
- [ ] Replit project created with Reserved VM deployment configured
- [ ] Postgres database provisioned with pgvector, pg_trgm, citext extensions
- [ ] Custom domain `support.mcgcollege.com` configured + TLS
- [ ] All secrets stored in Replit Secrets (none in code)
- [ ] Sentry project created and DSN wired
- [ ] Resend domain verified (DKIM/SPF/DMARC)

### Code
- [ ] Next.js 14 App Router + TypeScript strict
- [ ] Tailwind with MCG color scales (50–950 for brand + ink)
- [ ] shadcn/ui installed with MCG theming
- [ ] Drizzle ORM + migrations system
- [ ] Pino logger with PII redaction
- [ ] Zod schema for env vars (refuse to start if invalid)
- [ ] Rate limiting on auth + chat endpoints
- [ ] CSRF protection on state-changing routes
- [ ] CSP + security headers in `next.config.mjs`

### Integrations
- [ ] CampusLogin typed client from swagger.json
- [ ] Nightly student sync cron working
- [ ] Moodle client (after DJ confirms URL/plugin)
- [ ] Anthropic streaming client with tool use
- [ ] OpenAI embeddings client
- [ ] Resend transactional emails

### Auth
- [ ] Magic-link login for students
- [ ] Magic-link + TOTP for agents
- [ ] Server-side session store
- [ ] Ownership middleware on all student-data routes
- [ ] Re-auth flow for sensitive actions
- [ ] Email enumeration prevention
- [ ] Account-level rate limits

### AI
- [ ] System prompt versioned in `lib/ai/prompts/`
- [ ] 10 MVP tools defined with Zod schemas
- [ ] Tools never accept identity params
- [ ] Hybrid RAG (vector + keyword + RRF)
- [ ] Confidence scoring
- [ ] Streaming SSE to client
- [ ] Conversation + message logging
- [ ] Cost + token tracking

### Tickets
- [ ] Creation from AI chat
- [ ] Student list + detail views
- [ ] Agent inbox with filters
- [ ] AI-suggested replies
- [ ] Email notifications
- [ ] Routing by campus
- [ ] SLA tracking
- [ ] CSAT loop

### KB
- [ ] Article CRUD in admin
- [ ] Markdown editor
- [ ] Chunking + embedding pipeline
- [ ] Versioning
- [ ] Public + authenticated visibility
- [ ] Campus/program scoping
- [ ] Seed content (25 articles)
- [ ] Review-date reminders

### Compliance & Security
- [ ] Audit log on all sensitive actions
- [ ] Data export endpoint for students
- [ ] Privacy notice + cookie banner
- [ ] DPAs filed for all third parties
- [ ] PII redaction in logs verified
- [ ] CSP tested with no violations in normal use
- [ ] Pentest or rigorous self-review before launch

### Quality
- [ ] Unit tests on auth, ownership, tool handlers
- [ ] E2E tests on login + ticket creation
- [ ] axe accessibility audit passing
- [ ] Lighthouse targets met
- [ ] Sentry receiving errors in staging

### Documentation
- [ ] `docs/ARCHITECTURE.md` written
- [ ] `docs/RUNBOOK.md` (deploy, key rotation, incident response)
- [ ] `docs/DECISIONS.md` (ADRs for major calls)
- [ ] `README.md` with setup steps for a new dev
- [ ] `.env.example` complete

---

## 19. RESOLVED & OPEN QUESTIONS

### ✅ Resolved (DJ confirmed)

| # | Question | Answer |
|---|---|---|
| 1 | Moodle URL | `https://mcgcollege.lingellearning.ca` (hosted by Lingel Learning, a Moodle Partner) |
| 2 | Finance data in API | Exists in CampusLogin but **not exposed via API**. Skip for MVP. Finance-related tickets escalate to human. |
| 3 | Advisor team for routing | MVP = single helpdesk: `dj.gupta@mcgcollege.com`. Multi-agent routing deferred to v1.1. |
| 4 | Student-triggered password resets | Yes — AI provides step-by-step guidance + deep link to Moodle's native forgot-password page. AI does **not** trigger the reset itself. |
| 5 | Domain | `support.mcgcollege.com` |
| 8 | Brand assets | DJ to provide (logo SVG, favicon, social share image) before Phase 1 gate |
| 9 | Agent email convention | `mcgcollege.com` for Resend; NIMT-era `nimt.ca` addresses mask to `mcgcollege.com` at email server level |
| 10 | Retention policy | 7-year audit log + student data retention confirmed |

### 🟡 Still open — needs answer before related phase

| # | Question | Blocking Phase | Path to resolve |
|---|---|---|---|
| 6 | CampusLogin webhooks vs. polling | Phase 2 (student sync) | Email CampusLogin support: "Are webhooks available for student create/update/status-change events on org 900?" Default to nightly polling if no answer in 1 week. |
| 7 | `mailListId` for active students | Phase 2 (any contact-scoped endpoint) | **Not discoverable via the API** — confirmed: swagger has no endpoint that lists mailLists, and `GetStudentResponse` doesn't include it. Two options: **(a)** Email CampusLogin support: "What is the mailListId for our active student segment on org 900?" — fastest path. **(b)** Hit `POST /api/Contacts/Contacts/{mailListId}` with a few likely values (1, 2, 100) and inspect responses — fragile but doable. Recommendation: option (a). |
| - | Moodle Web Services enabled | Phase 5 (Moodle integration) | Open Lingel Learning support ticket. See Section 4.2 action item. |
| - | `mod_attendance` plugin available | Phase 5 (attendance tool) | Same Lingel ticket. If not available, drop `get_my_attendance` from MVP. |
| - | Brand assets received | Phase 1 gate | DJ to provide |

### 📋 Pre-launch (Phase 7)

- Privacy policy + Terms of Service final copy (DJ + legal review)
- DPAs filed for Anthropic, OpenAI, Resend, Sentry (verify "no training on customer data" toggles)
- Lingel Learning's data residency confirmed (Canadian hosting? Confirm for PIPEDA story)

---

**End of spec. Build with care. Ship boring tech, fast iteration, and a polished UI.**
