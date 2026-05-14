/**
 * Daily settings cache refresh. Run via Replit cron:
 *   30 3 * * *  cd /home/runner/$REPL_SLUG && npm run cron:sync-settings
 */
import 'dotenv/config';
import { syncSettings } from '../lib/campuslogin/sync';
import { logger } from '../lib/logger';

async function main() {
  try {
    await syncSettings();
    logger.info('sync-settings complete');
  } catch (err) {
    logger.error({ err }, 'sync-settings failed');
    process.exitCode = 1;
  }
}

void main();
