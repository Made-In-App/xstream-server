import pino from 'pino';

export const logger = pino({
  name: 'ingest',
  level: process.env.LOG_LEVEL ?? 'info',
});
