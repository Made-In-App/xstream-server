import { logger } from './lib/logger.js';
import { run } from './index.js';

export { run } from './index.js';

async function runLoop() {
  const intervalHours = parseInt(process.env.INGEST_INTERVAL_HOURS || '6', 10);
  const intervalMs = intervalHours * 60 * 60 * 1000;

  logger.info({ intervalHours }, 'Starting ingest loop');

  await run();

  setInterval(async () => {
    logger.info('Scheduled ingest cycle starting');
    try {
      await run();
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

