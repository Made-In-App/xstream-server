import { promises as fs } from 'fs';
import path from 'path';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import {
  fetchM3U,
  fetchXmlTv,
  fetchLiveStreams,
  fetchVodStreams,
  fetchSeries,
  fetchLiveCategories,
  fetchVodCategories,
  fetchSeriesCategories,
  fetchUserInfo,
} from './lib/xtream-client.js';
import { buildSnapshotBundle } from './lib/normalizer.js';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function run() {
  logger.info('Starting ingest cycle');

  const root = path.resolve(env.STORAGE_ROOT);
  await ensureDir(root);

  logger.info({ root }, 'Storage directory ready');

  const [
    liveM3U,
    fullM3U,
    xmltv,
    liveStreams,
    vodStreams,
    seriesStreams,
    liveCategories,
    vodCategories,
    seriesCategories,
    userInfoResponse,
  ] = await Promise.all([
    fetchM3U('m3u').catch((err) => {
      logger.error({ err }, 'Failed to fetch live M3U');
      return '';
    }),
    fetchM3U('m3u_plus').catch((err) => {
      logger.error({ err }, 'Failed to fetch full M3U');
      return '';
    }),
    fetchXmlTv().catch((err) => {
      logger.error({ err }, 'Failed to fetch XMLTV');
      return '<?xml version="1.0"?><tv></tv>';
    }),
    fetchLiveStreams().catch((err) => {
      logger.error({ err }, 'Failed to fetch live streams');
      return { stream_list: [] };
    }),
    fetchVodStreams().catch((err) => {
      logger.error({ err }, 'Failed to fetch VOD streams');
      return { movie_list: [] };
    }),
    fetchSeries().catch((err) => {
      logger.error({ err }, 'Failed to fetch series');
      return { series_list: [] };
    }),
    fetchLiveCategories().catch((err) => {
      logger.error({ err }, 'Failed to fetch live categories');
      return { categories: [] };
    }),
    fetchVodCategories().catch((err) => {
      logger.error({ err }, 'Failed to fetch VOD categories');
      return { categories: [] };
    }),
    fetchSeriesCategories().catch((err) => {
      logger.error({ err }, 'Failed to fetch series categories');
      return { categories: [] };
    }),
    fetchUserInfo().catch((err) => {
      logger.error({ err }, 'Failed to fetch user info');
      throw err; // User info is critical
    }),
  ]);

  const bundle = buildSnapshotBundle({
    liveStreams: Array.isArray(liveStreams) ? liveStreams : liveStreams?.stream_list ?? [],
    vodStreams: Array.isArray(vodStreams) ? vodStreams : vodStreams?.movie_list ?? [],
    seriesStreams: Array.isArray(seriesStreams) ? seriesStreams : seriesStreams?.series_list ?? [],
    liveCategories: Array.isArray(liveCategories) ? liveCategories : liveCategories?.categories ?? [],
    vodCategories: Array.isArray(vodCategories) ? vodCategories : vodCategories?.categories ?? [],
    seriesCategories: Array.isArray(seriesCategories) ? seriesCategories : seriesCategories?.categories ?? [],
    userInfoResponse,
  });

  const outputs = [
    { file: 'live.m3u', content: liveM3U },
    { file: 'full.m3u', content: fullM3U },
    { file: 'guide.xml', content: xmltv },
    { file: 'bundle.json', content: JSON.stringify(bundle, null, 2) },
  ];

  await Promise.all(
    outputs.map(({ file, content }) => fs.writeFile(path.join(root, file), content, 'utf-8')),
  );

  logger.info({ root, files: outputs.map((o) => o.file) }, 'Ingest cycle completed');
}

run().catch((error) => {
  logger.error(error, 'Ingest cycle failed');
  process.exit(1);
});
