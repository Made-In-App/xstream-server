import type { FastifyInstance } from 'fastify';
import type { StreamMetadata } from '@xstream/core';
import { promises as fs } from 'fs';
import path from 'path';
import { loadSnapshotBundle } from '../lib/snapshot.js';
import { env } from '../lib/env.js';
import { registerRelayProxy } from '../lib/relay-proxy.js';

interface PlayerApiQuery {
  username?: string;
  password?: string;
  action?: string;
}

function ensureAuth(username?: string, password?: string, expectedUser?: string, expectedPass?: string): boolean {
  if (!username || !password) return false;
  if (!expectedUser || !expectedPass) return true; // If not configured, allow any
  return username === expectedUser && password === expectedPass;
}

function streamToXtream(stream: StreamMetadata, relayBase: string, username: string, password: string) {
  const typePath = stream.streamType === 'movie' ? 'movie' : stream.streamType === 'series' ? 'series' : 'live';
  const extension = stream.streamType === 'movie' ? '.ts' : stream.streamType === 'series' ? '.mkv' : '.m3u8';
  return {
    num: 0,
    name: stream.name,
    stream_type: typePath,
    stream_id: stream.id,
    stream_icon: stream.logo ?? '',
    epg_channel_id: stream.epgChannelId ?? '',
    category_name: stream.group ?? '',
    direct_source: `${relayBase}/${typePath}/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${stream.id}${extension}`,
  };
}

function buildM3ULines(streams: StreamMetadata[], relayBase: string, username: string, password: string) {
  const lines = ['#EXTM3U'];
  for (const stream of streams) {
    const typePath = stream.streamType === 'movie' ? 'movie' : stream.streamType === 'series' ? 'series' : 'live';
    const extension = stream.streamType === 'movie' ? '.ts' : stream.streamType === 'series' ? '.mkv' : '.m3u8';
    const url = `${relayBase}/${typePath}/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${stream.id}${extension}`;
    const attrs = [
      stream.epgChannelId ? `tvg-id="${stream.epgChannelId}"` : null,
      stream.logo ? `tvg-logo="${stream.logo}"` : null,
      stream.group ? `group-title="${stream.group}"` : null,
    ]
      .filter(Boolean)
      .join(' ');
    lines.push(`#EXTINF:-1 ${attrs},${stream.name}`.trim());
    lines.push(url);
  }
  return lines.join('\n');
}

export async function registerRoutes(server: FastifyInstance) {
  server.get('/health', async () => ({ status: 'ok' }));

  // Proxy relay requests to internal relay service
  await registerRelayProxy(server);

  server.get('/player_api.php', async (request, reply) => {
    const query = request.query as PlayerApiQuery;
    const { username, password, action } = query;
    
    let bundle;
    try {
      bundle = await loadSnapshotBundle();
    } catch (error) {
      server.log.error(error, 'Failed to load snapshot');
      return reply.status(503).send({ error: 'Service unavailable - snapshot not loaded' });
    }

    const expectedUser = env.XTREAM_USERNAME ?? bundle.user.username;
    const expectedPass = env.XTREAM_PASSWORD ?? bundle.user.password;

    if (!ensureAuth(username, password, expectedUser, expectedPass)) {
      return reply.status(401).send({
        user_info: {
          auth: 0,
          status: 'Disabled',
          username: username ?? '',
          password: password ?? '',
          message: 'Invalid credentials',
        },
      });
    }

    // Use internal relay path
    const relayBase = env.PUBLIC_BASE_URL || 'http://localhost:8080';

    if (!action || action === '') {
      return {
        user_info: {
          username,
          password,
          auth: '1',
          status: bundle.user.status,
          exp_date: `${Math.floor(Date.now() / 1000) + 86400}`,
          is_trial: bundle.user.isTrial ? '1' : '0',
          active_cons: '0',
          created_at: `${Math.floor(Date.now() / 1000)}`,
          max_connections: String(bundle.user.maxConnections),
          allowed_output_formats: ['m3u8', 'ts'],
          message: '',
        },
        server_info: {
          url: new URL(relayBase).hostname,
          port: '80',
          https_port: bundle.server.httpsPort ?? '443',
          server_protocol: 'https',
          rtmp_port: '0',
          timezone: bundle.server.timezone,
          timestamp_now: bundle.server.timestamp,
          time_now: new Date(bundle.server.timestamp * 1000).toISOString(),
          process: true,
        },
      };
    }

    if (action === 'get_live_streams') {
      return bundle.snapshot.live.map((stream) => streamToXtream(stream, relayBase, username!, password!));
    }

    if (action === 'get_vod_streams') {
      return bundle.snapshot.vod.map((stream) => streamToXtream(stream, relayBase, username!, password!));
    }

    if (action === 'get_series') {
      return bundle.snapshot.series.map((stream) => streamToXtream(stream, relayBase, username!, password!));
    }

    if (action === 'get_live_categories') {
      return bundle.snapshot.categories.filter((cat) => cat.type === 'live');
    }

    if (action === 'get_vod_categories') {
      return bundle.snapshot.categories.filter((cat) => cat.type === 'movie');
    }

    if (action === 'get_series_categories') {
      return bundle.snapshot.categories.filter((cat) => cat.type === 'series');
    }

    return [];
  });

  server.get('/get.php', async (request, reply) => {
    const query = request.query as { username?: string; password?: string; type?: string };
    const { username, password, type = 'm3u' } = query;
    
    let bundle;
    try {
      bundle = await loadSnapshotBundle();
    } catch (error) {
      server.log.error(error, 'Failed to load snapshot');
      reply.code(503);
      return '#EXTM3U\n# Service unavailable';
    }

    const expectedUser = env.XTREAM_USERNAME ?? bundle.user.username;
    const expectedPass = env.XTREAM_PASSWORD ?? bundle.user.password;

    if (!ensureAuth(username, password, expectedUser, expectedPass)) {
      reply.code(401);
      return '#EXTM3U\n# Unauthorized';
    }

    const relayBase = env.PUBLIC_BASE_URL || 'http://localhost:8080';
    const streams = type === 'm3u_plus'
      ? [...bundle.snapshot.live, ...bundle.snapshot.vod, ...bundle.snapshot.series]
      : bundle.snapshot.live;

    const body = buildM3ULines(streams, relayBase, username!, password!);
    reply.header('Content-Type', 'application/vnd.apple.mpegurl');
    return body;
  });

  server.get('/xmltv.php', async (request, reply) => {
    try {
      const xmlPath = path.resolve(env.DATA_ROOT, 'guide.xml');
      const xml = await fs.readFile(xmlPath, 'utf-8');
      reply.header('Content-Type', 'application/xml');
      return xml;
    } catch {
      reply.code(404);
      return '<tv></tv>';
    }
  });
}
