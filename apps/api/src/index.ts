import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './lib/env.js';
import { registerRoutes } from './routes/index.js';

const server = Fastify({
  logger: true,
});

await server.register(cors, {
  origin: '*',
});

await server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

registerRoutes(server);

const port = env.PORT;
const host = env.HOST;

server
  .listen({ port, host })
  .then((address) => {
    server.log.info(`API listening at ${address}`);
  })
  .catch((err) => {
    server.log.error(err, 'Failed to start API');
    process.exit(1);
  });
