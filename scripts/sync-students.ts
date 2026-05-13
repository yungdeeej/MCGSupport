/**
 * Nightly student sync. Run via Replit cron:
 *   0 3 * * *  cd /home/runner/$REPL_SLUG && npm run cron:sync-students
 */
import 'dotenv/config';
import { syncStudents } from '../lib/campuslogin/sync';
import { logger } from '../lib/logger';

async function main() {
  const start = Date.now();
  try {
    const { upserted } = await syncStudents();
    logger.info({ upserted, ms: Date.now() - start }, 'sync-students complete');
  } catch (err) {
    logger.error({ err }, 'sync-students failed');
    process.exitCode = 1;
  }
}

void main();
