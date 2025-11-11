import type { FastifyInstance } from 'fastify';
import proxy from '@fastify/http-proxy';

const RELAY_INTERNAL_URL = 'http://localhost:8090';

export async function registerRelayProxy(fastify: FastifyInstance) {
  // Proxy /live/*, /movie/*, /series/* to internal relay
  await fastify.register(proxy, {
    upstream: RELAY_INTERNAL_URL,
    prefix: '/live',
    rewritePrefix: '/live',
    http2: false,
  });

  await fastify.register(proxy, {
    upstream: RELAY_INTERNAL_URL,
    prefix: '/movie',
    rewritePrefix: '/movie',
    http2: false,
  });

  await fastify.register(proxy, {
    upstream: RELAY_INTERNAL_URL,
    prefix: '/series',
    rewritePrefix: '/series',
    http2: false,
  });
}

