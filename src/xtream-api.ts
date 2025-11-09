/**
 * Xtream API Handlers
 */

import { parseM3UAsync, extractStreamId } from './m3u-parser';
import { config } from './config';
import {
  LiveStream,
  VODStream,
  Series,
  Category,
  UserInfo,
} from './types';

/**
 * Get Live Streams
 */
export async function getLiveStreams(): Promise<LiveStream[]> {
  const streams = await parseM3UAsync(config.playlists.live);
  const result: LiveStream[] = [];

  streams.forEach((stream, idx) => {
    const streamId = extractStreamId(stream.url) || String(idx + 1);

    result.push({
      num: idx + 1,
      name: stream.name,
      stream_type: 'live',
      stream_id: streamId,
      stream_icon: stream.tvgLogo || '',
      epg_channel_id: stream.tvgId || '',
      added: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
      category_id: stream.groupTitle || 'General',
      category_name: stream.groupTitle || 'General',
      custom_sid: '',
      tv_archive: 0,
      direct_source: stream.url,
      tv_archive_duration: 0,
    });
  });

  return result;
}

/**
 * Get VOD Streams
 */
export async function getVODStreams(): Promise<VODStream[]> {
  const streams = await parseM3UAsync(config.playlists.vod);
  const result: VODStream[] = [];

  streams.forEach((stream, idx) => {
    const streamId = extractStreamId(stream.url) || String(idx + 1);
    const urlParts = stream.url.split('.');
    const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1] : 'mp4';

    result.push({
      num: idx + 1,
      name: stream.name,
      stream_type: 'movie',
      stream_id: streamId,
      stream_icon: stream.tvgLogo || '',
      rating: '0',
      rating_5based: 0,
      added: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
      category_id: stream.groupTitle || 'Movies',
      category_name: stream.groupTitle || 'Movies',
      container_extension: extension,
      custom_sid: '',
      direct_source: stream.url,
    });
  });

  return result;
}

/**
 * Get Series
 */
export async function getSeries(): Promise<Series[]> {
  const streams = await parseM3UAsync(config.playlists.series);
  const seriesMap = new Map<string, Series>();

  streams.forEach((stream) => {
    const name = stream.name;
    // Extract series name (remove S01 E01, etc.)
    let seriesName = name;
    const seriesMatch = name.match(/^(.+?)\s+S\d+\s+E\d+/i);
    if (seriesMatch) {
      seriesName = seriesMatch[1].trim();
    }

    if (!seriesMap.has(seriesName)) {
      const streamId = extractStreamId(stream.url) || String(seriesMap.size + 1);

      seriesMap.set(seriesName, {
        num: seriesMap.size + 1,
        name: seriesName,
        series_id: streamId,
        cover: stream.tvgLogo || '',
        plot: '',
        cast: '',
        director: '',
        genre: stream.groupTitle || 'Series',
        releaseDate: new Date().toISOString().split('T')[0],
        last_modified: new Date().toISOString().replace('T', ' ').split('.')[0],
        rating: '0',
        rating_5based: 0,
        backdrop_path: [],
        youtube_trailer: '',
        episode_run_time: '0',
        category_id: stream.groupTitle || 'Series',
        category_name: stream.groupTitle || 'Series',
      });
    }
  });

  return Array.from(seriesMap.values());
}

/**
 * Get Live Categories
 */
export async function getLiveCategories(): Promise<Category[]> {
  const streams = await parseM3UAsync(config.playlists.live);
  const categoriesMap = new Map<string, Category>();

  streams.forEach((stream) => {
    const catName = stream.groupTitle || 'General';
    if (!categoriesMap.has(catName)) {
      categoriesMap.set(catName, {
        category_id: Buffer.from(catName).toString('base64').substring(0, 32),
        category_name: catName,
        parent_id: 0,
      });
    }
  });

  return Array.from(categoriesMap.values());
}

/**
 * Get VOD Categories
 */
export async function getVODCategories(): Promise<Category[]> {
  const streams = await parseM3UAsync(config.playlists.vod);
  const categoriesMap = new Map<string, Category>();

  streams.forEach((stream) => {
    const catName = stream.groupTitle || 'Movies';
    if (!categoriesMap.has(catName)) {
      categoriesMap.set(catName, {
        category_id: Buffer.from(catName).toString('base64').substring(0, 32),
        category_name: catName,
        parent_id: 0,
      });
    }
  });

  return Array.from(categoriesMap.values());
}

/**
 * Get Series Categories
 */
export async function getSeriesCategories(): Promise<Category[]> {
  const streams = await parseM3UAsync(config.playlists.series);
  const categoriesMap = new Map<string, Category>();

  streams.forEach((stream) => {
    const catName = stream.groupTitle || 'Series';
    if (!categoriesMap.has(catName)) {
      categoriesMap.set(catName, {
        category_id: Buffer.from(catName).toString('base64').substring(0, 32),
        category_name: catName,
        parent_id: 0,
      });
    }
  });

  return Array.from(categoriesMap.values());
}

/**
 * Get User Info
 */
export function getUserInfo(username: string): UserInfo {
  return {
    username,
    password: '***',
    message: 'Banned',
    auth: 1,
    status: 'Active',
    exp_date: '0',
    is_trial: '0',
    active_cons: '0',
    created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
    max_connections: '1',
    allowed_output_formats: ['m3u8', 'ts'],
  };
}

