# ADRs — MCG Support Portal

Short, dated decision records. New ones go at the top.

---

## ADR-008 · Hybrid search via reciprocal-rank fusion (RRF)

**Date:** 2026-05-13
**Status:** Accepted

**Decision:** KB search runs pgvector cosine similarity (top-10) and pg_trgm trigram match (top-10) in parallel, then merges via RRF with k=60.

**Why not vector-only?** Empirically, vector embeddings miss matches when the query uses an exact term that doesn't appear in any chunk verbatim ("T2202", "Lingel"). Keyword search picks those up.

**Why not BM25?** Postgres doesn't ship with BM25 out of the box. `pg_trgm` similarity is good enough for our corpus size (<100 articles) and one extension we already need for fuzzy title matching.

**Tradeoff:** Two queries per search instead of one. Acceptable — both are sub-50ms with proper indexes.

---

## ADR-007 · Tools never accept identity parameters

**Date:** 2026-05-13
**Status:** Accepted (binding)

**Decision:** No AI tool may take a `studentId`, `email`, or any identity field as an input parameter. The runtime injects `studentId` from the session.

**Why:** The single biggest attack surface for AI agents over student records is prompt injection convincing the model to look up someone else's data. If the parameter doesn't exist in the JSON schema, the attack can't happen — the model literally has no slot to put another ID in.

**Tradeoff:** Slightly less flexible tool surface. We could let agents impersonate students for support, but the cost of one mistake there outweighs the convenience. Agents have a separate read API.

---

## ADR-006 · Magic links instead of passwords

**Date:** 2026-05-12
**Status:** Accepted

**Decision:** Students authenticate via emailed magic links. No password field.

**Why:**
- Password-reset is the #1 support ticket category at most colleges.
- A magic link is a password reset every time — and is single-use, time-limited, and tied to inbox access.
- Lower implementation complexity. No password storage, no rotation policy.

**Tradeoff:** Each login requires email round-trip latency (typically <30s with Resend). Acceptable for an SSO-replacement use case where the student has the inbox open anyway. For agents, we layer **TOTP** on top because their access is broader.

---

## ADR-005 · Postgres-only persistence (no Redis, no S3 for primary data)

**Date:** 2026-05-12
**Status:** Accepted

**Decision:** Sessions, rate-limit buckets, AI conversations, KB embeddings, audit logs — all in Postgres.

**Why:** Replit's deployment story is one VM + one Postgres. Adding Redis means another secret, another health-check, another thing to monitor.

**Cost:** Slightly higher per-operation latency than Redis for rate-limit lookups. At our expected volume (hundreds of authenticated users, not millions), it's a non-issue. Re-evaluate above 5k QPS.

---

## ADR-004 · Drizzle ORM over Prisma

**Date:** 2026-05-11
**Status:** Accepted

**Decision:** Use Drizzle as the ORM.

**Why:**
- Drizzle's generated SQL is closer to what we'd write by hand — easier to reason about.
- Native pgvector support without third-party plugins.
- Smaller bundle, faster cold start (matters on Replit where the build is rebuilt each deploy).

**Tradeoff:** Prisma's Studio is slicker; Drizzle Studio is a step behind. We use raw psql for most ops anyway.

---

## ADR-003 · Anthropic Claude (Sonnet 4.5) for the assistant

**Date:** 2026-05-11
**Status:** Accepted

**Decision:** Use `claude-sonnet-4-5` for student-facing AI; consider `claude-haiku-4-5` for cheap classification tasks (e.g. ticket routing in v1.1).

**Why:**
- Strong tool-use behavior — Sonnet 4.5 reliably emits structured tool_use blocks.
- 200k+ context window leaves room for KB grounding without aggressive truncation.
- Anthropic's data-processing terms include "no training on customer data" by default for enterprise tier.

**Tradeoff:** Locked into one vendor. We mitigate by keeping the system prompt and tool schemas vendor-agnostic — the schemas are plain JSON Schema, not Anthropic-specific.

---

## ADR-002 · One Next.js app, no separate API server

**Date:** 2026-05-11
**Status:** Accepted

**Decision:** Server logic lives in `app/api/*` route handlers and `lib/*`. No Express/Hono service alongside.

**Why:**
- Less infrastructure to operate.
- RSC + server actions cover almost every need; for streaming SSE we use the standard Web Streams API.
- Sessions resolved server-side in middleware/route handlers — no JWT, no cross-service auth.

**Tradeoff:** Long-running jobs (sync crons) need to run outside the request lifecycle. We do that via `scripts/*.ts` invoked by Replit Cron, which is sufficient.

---

## ADR-001 · Append-only audit log (application-level)

**Date:** 2026-05-11
**Status:** Accepted

**Decision:** `audit_log` is treated as append-only by convention — no UPDATE/DELETE routes exist. PII fields are SHA-256 hashed before insertion.

**Why:** PIPEDA + Alberta records retention require 7 years. Hashing PII before write avoids re-identification risk if the table is ever exported.

**Why not row-level immutability via Postgres triggers?** We *could* add a trigger that rejects UPDATE/DELETE. We didn't because:
- The application-level convention is reviewable in one place (no surprise DELETE permission).
- Triggers complicate migrations and DR restores.
- DB-level immutability is a defense-in-depth nice-to-have; we'll add it pre-launch if pentest flags it.
