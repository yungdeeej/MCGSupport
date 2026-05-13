# MCG Support — Architecture

A short tour of how the system is wired. Treat the README at the repo root as the source of truth for *what* we're building; this file documents *how*.

## High level

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Browser  (student or agent)                           │
│  Next.js App Router · React Server Components · streaming SSE for chat   │
└────────────┬─────────────────────────────────────────────────────────────┘
             │                                              ▲
             ▼                                              │
┌──────────────────────────────────────────────────────────────────────────┐
│  Next.js server (Replit Reserved VM, Node 20)                            │
│  ── API routes (auth · tickets · KB · AI chat · admin · webhooks)        │
│  ── lib/ai/runtime.ts (Anthropic tool-use loop + RAG)                    │
│  ── lib/auth (sessions · magic links · TOTP · ownership middleware)      │
│  ── Pino logger (PII-redacted) → stdout                                  │
└──┬─────────────┬───────────────┬────────────────┬─────────────┬─────────┘
   │             │               │                │             │
   ▼             ▼               ▼                ▼             ▼
┌────────┐  ┌────────┐    ┌──────────┐    ┌────────────┐  ┌──────────┐
│Postgres│  │Campus- │    │  Moodle  │    │ Anthropic  │  │ OpenAI   │
│+pgvector│ │ Login  │    │WebServices│   │  Claude    │  │ embeds   │
└────────┘  └────────┘    └──────────┘    └────────────┘  └──────────┘
   ▲
   │  (single source of truth for sessions, tickets, KB, audit,
   │   AI conversations, students mirror, settings cache)
```

## Why this shape

- **One framework, one runtime.** Next.js App Router gives us SSR pages, RSC for cheap data fetching, and `/app/api/*` route handlers — no separate Express server, no API gateway. Replit deployments stay simple.
- **Postgres for everything.** Students, tickets, KB articles, KB embeddings (pgvector), AI conversations, audit log, and rate-limit buckets all share one DB. No Redis, no DynamoDB, no S3 for primary data. Less moving stuff means fewer 3 AM pages.
- **Magic links over passwords.** Most "I can't log in" tickets at colleges come from forgotten passwords. We sidestep that whole category. Sessions are server-side rows so admins can revoke any one immediately.
- **AI sees the student through the session.** Tools never accept a `studentId` parameter; the ID is injected by the runtime from `getSession()`. The model literally cannot be tricked into looking up another student.

## The AI runtime

`lib/ai/runtime.ts` runs the tool-use loop:

1. Receive a user message.
2. Run a **hybrid search** (`lib/kb/search.ts`) against the KB. Inject top-3 chunks into the system prompt as `<knowledge_base>...</knowledge_base>` *data*.
3. Call Anthropic with the conversation history, the KB-augmented system prompt, and the JSON-schema-described tool catalog (`lib/ai/tools/`).
4. Stream the assistant's text deltas back to the browser via SSE.
5. For every `tool_use` block the model emits, look up the handler in `toolMap`, validate input with the tool's Zod schema, run it, and feed `tool_result` blocks back into the next turn.
6. Cap at 6 tool-use turns. Persist every assistant + tool_result message to `ai_messages`.
7. Derive a confidence label (`lib/ai/confidence.ts`) from KB score + escalation keywords + tool errors and emit it to the client.

Sensitive tools (e.g. `get_my_grades`) check `isReauthValid()`; if the session hasn't re-authenticated in the last 10 minutes, the runtime returns a synthetic `tool_result: reauth_required` and emits a `reauth_required` SSE event so the UI can prompt.

## Rows-of-truth

- Students are **mirrored**, not authoritative. CampusLogin is the source — we sync on a nightly cron (`scripts/sync-students.ts`). On every login we re-check that the mirrored row is `active` before granting a session, but the sync is what populates new students.
- Settings (programs/campuses/admission-stages/schools) are cached in `settings_cache` with 24-hour TTL.
- KB articles + embeddings live in our DB. Embeddings refresh on save and via a nightly job if the content hash changes.

## Security defaults

- Magic-link tokens: 32 random bytes, SHA-256 hashed at rest, single-use, 15-minute TTL.
- Session IDs: 32 random bytes, opaque (no JWT). Looked up on every request.
- TOTP secrets for agents: AES-256-GCM at rest. Decrypted in-memory only.
- Tool calls: every one logged to `audit_log` with sanitized payload (PII fields hashed). The append-only convention is application-level; we don't expose any UPDATE/DELETE routes for that table.
- Rate limiting: token-bucket on Postgres (`lib/ratelimit.ts`). Magic-link per-email and per-IP, AI chat per-student and per-IP, KB search per-IP.

## What we deliberately did **not** build

- A separate ticket queue / kafka pipeline. Inserts on `tickets` + `notifyTicketCreated()` are synchronous. We can swap in a queue later if volume justifies it.
- A separate auth service. The whole auth stack is ~400 lines under `lib/auth/` and easier to audit than NextAuth.
- A WebSocket layer. Streaming chat is plain SSE over the existing HTTP path.
- A document-store for attachments. We can move to Replit Object Storage when first attachments land.

## Phase gate status

See README §15. The code today covers the Phase-2-through-Phase-6 vertical slice end-to-end — every API and UI surface exists. The remaining work is **operational**: keys, real swagger generation, Lingel coordination, content writing.
