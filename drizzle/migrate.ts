/**
 * Apply every .sql file in drizzle/migrations in lexical order.
 * Idempotent: tracks applied filenames in a meta table.
 *
 * Usage:
 *   npm run db:migrate
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    await client.query(`CREATE TABLE IF NOT EXISTS __migrations (
      id serial PRIMARY KEY,
      filename text UNIQUE NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );`);

    const dir = path.join(process.cwd(), 'drizzle/migrations');
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const exists = await client.query('SELECT 1 FROM __migrations WHERE filename=$1', [file]);
      if (exists.rowCount && exists.rowCount > 0) {
        console.log(`✓ skip ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`→ apply ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO __migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✓ applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ failed ${file}`);
        throw err;
      }
    }
    console.log('All migrations applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
