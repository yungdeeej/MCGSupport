# MCG Support — Local Setup

> The full product spec is in `README.md`. This file is the 10-minute onboarding for a new contributor.

## Prerequisites

- Node.js **20+**
- PostgreSQL **15+** with the `pgvector`, `pg_trgm`, and `citext` extensions available
- A clone of the repo

## Steps

```bash
git clone <repo> mcg-support && cd mcg-support
cp .env.example .env.local
# fill in DATABASE_URL at minimum; other keys can be empty for first boot
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open <http://localhost:3000>.

To sign in as the seeded admin agent:

1. Set `DEV_LOG_MAGIC_LINKS=true` in `.env.local` (will print the magic link URL to your dev console — DO NOT enable in production).
2. Go to `/login` and enter `dj.gupta@mcgcollege.com`.
3. Open the printed URL.

To sign in as a student, you must first either run the CampusLogin sync (real student data) or insert a test row:

```sql
INSERT INTO students (campuslogin_id, email, first_name, last_name, status)
VALUES (1, 'test.student@mcgcollege.com', 'Test', 'Student', 'active');
```

Then use that email at `/login`.

## Tests

```bash
npm test            # unit (vitest)
npm run test:e2e    # end-to-end (playwright) — requires the dev server
```

## Common scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server with HMR |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint via next |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Seed admin agent + KB articles |
| `npm run cron:sync-students` | One-off nightly student sync |
| `npm run cron:sync-settings` | One-off settings cache refresh |

## Deploying

See `docs/RUNBOOK.md` for the Replit deployment + key-rotation playbook.

## Where things live

- `app/` — Next.js App Router (pages + API routes)
- `lib/` — Server-side libraries (db, ai, auth, kb, tickets, integrations)
- `components/` — React components, split by feature
- `drizzle/migrations/` — Hand-written SQL migrations
- `tests/` — Unit (vitest) and e2e (playwright)
- `docs/` — Architecture, runbook, decision records

## Coding conventions

- TypeScript **strict** + `noUncheckedIndexedAccess`. No `any` without a comment justifying it.
- Server libs validate at the boundary with Zod. Anything coming over the wire (request body, upstream API response, tool input) gets a schema.
- Every action that touches a student record routes through `lib/auth/requireOwnership.ts`.
- Audit log every sensitive action via `lib/audit.ts` — actions are uppercase snake_case constants in `auditActions`.
- Never log raw PII. Use `hashPII()` from `lib/logger.ts`.
