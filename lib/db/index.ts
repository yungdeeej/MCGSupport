import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '../env';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

/**
 * Singleton pg pool. Drizzle wraps it. We reuse across Next.js HMR by
 * stashing on globalThis so we don't leak connections in dev.
 */
function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: env.DATABASE_URL || undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      // Replit hosted Postgres needs SSL in prod
      ssl:
        env.NODE_ENV === 'production' && env.DATABASE_URL.includes('replit')
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return global.__pgPool;
}

export const db = drizzle(getPool(), { schema });
export type DB = typeof db;
export { schema };
