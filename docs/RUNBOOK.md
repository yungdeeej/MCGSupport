# MCG Support — Runbook

Operational playbook. Live updates welcome — if you fix something at 2 AM, leave the steps behind for the next person.

---

## First-time setup

```bash
# 1. install deps
npm install

# 2. create .env.local from .env.example and fill in the keys
cp .env.example .env.local

# 3. ensure Postgres has the right extensions (the first migration does this)
npm run db:migrate

# 4. seed admin agent + starter KB articles
npm run db:seed

# 5. run the dev server
npm run dev
```

The app will refuse to start in **production** if any required env var is missing. In dev it falls back to safe defaults so you can iterate without every secret wired up.

---

## Deploy to Replit

1. Push to `main`.
2. Replit Deployments → Reserved VM (the spec mandates this; do not use Autoscale for the chat workload).
3. Set the production env vars in **Replit Secrets**. The keys to set are listed in `.env.example`. Required in prod: `DATABASE_URL`, `CAMPUSLOGIN_API_KEY`, `MOODLE_API_TOKEN`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `SESSION_SECRET`, `ENCRYPTION_KEY`.
4. Build command: `npm install --omit=dev && npm run build`.
5. Run command: `npm start`.
6. Custom domain: `support.mcgcollege.com`. Set CNAME → Replit, verify TLS.
7. Set up scheduled jobs (Replit Cron):
   - `0 3 * * *` — `npm run cron:sync-students`
   - `30 3 * * *` — `npm run cron:sync-settings`
8. Verify Sentry is receiving events — visit any error page or trigger a deliberate exception.

---

## Rotate a key

Any of the API keys can be rotated without redeploying — `lib/env.ts` pulls from `process.env` at module load, and our integration clients read it on every call.

1. Generate a new key with the upstream provider.
2. Update **Replit Secrets** with the new value.
3. **Restart** the deployment (Replit dashboard → Restart). This re-imports `env.ts` with the new value.
4. Revoke the old key with the upstream provider once you've confirmed the new one works.

For **`SESSION_SECRET`**: changing this **invalidates all sessions**. Schedule it for off-hours and post a banner; users will need to sign in again.

For **`ENCRYPTION_KEY`**: do **not** change without first migrating TOTP secrets. Process:
1. Generate new key.
2. Run a one-off script that decrypts each `agents.totp_secret_encrypted` with the old key and re-encrypts with the new key.
3. Swap in the new key in Secrets.

---

## Database operations

```bash
# pull live schema
npx drizzle-kit introspect

# generate a new migration from schema changes
npm run db:generate

# apply pending migrations
npm run db:migrate

# open the Drizzle studio (read-only-ish DB browser)
npm run db:studio
```

Backup: rely on Replit's automatic Postgres snapshots. If you need a manual snapshot before a risky migration:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%F).sql
```

---

## Incident response

### "AI is replying weird" / hallucinating

1. Pull the latest entries from `ai_messages` for the affected conversation: `SELECT * FROM ai_messages WHERE conversation_id = X ORDER BY id;`
2. Inspect the `content` jsonb — look at what tool results came back, and what KB chunks were injected. The system prompt is in `lib/ai/prompts/student-assistant.v1.md`.
3. If a KB chunk was misleading, fix the article and re-publish — embeddings refresh on save.
4. If the issue is prompt-level, bump to `student-assistant.v2.md` and update `PROMPT_VERSION` in `lib/ai/prompts/index.ts`.

### Login failures spike

1. Check `audit_log` for `LOGIN_REQUEST` and `RATE_LIMIT_HIT` over the last hour.
2. If RATE_LIMIT_HIT is high from a single IP, you're being scanned — review and consider blocking at the load balancer.
3. If `LOGIN_REQUEST` is spiking but `LOGIN_SUCCESS` is flat, Resend is probably failing. Check Resend dashboard.

### Suspected breach

1. Revoke **all** sessions immediately: `TRUNCATE sessions;`
2. Rotate `SESSION_SECRET` and `ENCRYPTION_KEY`.
3. Pull the last 24 hours of `audit_log` and search for `IDOR_ATTEMPT`, `PERMISSION_DENIED`, unusual `TOOL_CALL_*` patterns.
4. Notify privacy@mcgcollege.com and follow PIPEDA breach-reporting timelines (72 hours to OPC if real risk of significant harm).

---

## Common gotchas

- **Migrations need `pgvector`, `pg_trgm`, `citext` extensions.** `drizzle/migrations/0000_extensions.sql` enables them; run it first on any new DB.
- **HNSW index** on `kb_embeddings.embedding` (created in `0001_post_schema_indexes.sql`) builds slowly on first load. Allow ~30 seconds per 10k chunks.
- **Streaming SSE through some corporate proxies gets buffered.** We set `x-accel-buffering: no` to defend against nginx default; if a campus user reports "chat freezes then bursts", that's the cause.
- **Resend rejects from-domain mismatches.** The `RESEND_FROM_EMAIL` must match a verified domain. Use `support.mcgcollege.com`, not `mcgcollege.com`.
- **`mod_attendance` plugin** may not be enabled on the Lingel-hosted Moodle. If `getAttendanceSessions` returns errors for every course, that's the cause — file with Lingel.

---

## Useful one-liners

```bash
# count tickets by status
psql "$DATABASE_URL" -c "SELECT status, COUNT(*) FROM tickets GROUP BY status;"

# top KB articles by views
psql "$DATABASE_URL" -c "SELECT slug, view_count, helpful_count, not_helpful_count FROM kb_articles ORDER BY view_count DESC LIMIT 20;"

# AI cost yesterday
psql "$DATABASE_URL" -c "SELECT SUM(cost_cents)/100.0 AS cad FROM ai_conversations WHERE started_at::date = current_date - 1;"

# IDOR attempts in the last 24h (should be zero)
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM audit_log WHERE action = 'IDOR_ATTEMPT' AND created_at > now() - interval '24 hours';"
```
