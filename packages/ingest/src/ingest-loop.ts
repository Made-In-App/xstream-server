import { logger } from './lib/logger.js';
import { env } from './lib/env.js';

// Re-export main ingest function
export { run } from './index.js';

// Loop version for continuous running
async function runLoop() {
  const intervalHours = parseInt(process.env.INGEST_INTERVAL_HOURS || '6', 10);
  const intervalMs = intervalHours * 60 * 60 * 1000;

  logger.info({ intervalHours }, 'Starting ingest loop');

  // Run immediately
  await import('./index.js').then((m) => m.default?.());

  // Then schedule periodic runs
  setInterval(async () => {
    logger.info('Scheduled ingest cycle starting');
    try {
      await import('./index.js').then((m) => m.default?.());
    } catch (error) {
      logger.error(error, 'Scheduled ingest cycle failed');
    }
  }, intervalMs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLoop().catch((error) => {
    logger.error(error, 'Ingest loop failed');
    process.exit(1);
  });
}

