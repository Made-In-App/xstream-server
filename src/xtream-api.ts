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
  SeriesInfo,
  VODInfo,
  Episode,
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
 * Restituisce le informazioni utente nel formato standard Xtream
 */
export function getUserInfo(username: string): UserInfo {
  // Calcola la data di creazione (formato: YYYY-MM-DD HH:MM:SS)
  const now = new Date();
  const created_at = now.toISOString().replace('T', ' ').split('.')[0];
  
  return {
    username,
    password: '***', // Password nascosta per sicurezza
    message: '', // Messaggio vuoto (alcuni client si aspettano stringa vuota, non "Banned")
    auth: 1, // 1 = autenticato, 0 = non autenticato
    status: 'Active', // Active, Disabled, Expired
    exp_date: '0', // 0 = senza scadenza, timestamp Unix per scadenza
    is_trial: '0', // 0 = no trial, 1 = trial
    active_cons: '0', // Numero di connessioni attive
    created_at, // Data di creazione account
    max_connections: '1', // Numero massimo di connessioni simultanee
    allowed_output_formats: ['m3u8', 'ts', 'flv', 'mp4'], // Formati supportati
  };
}

/**
 * Get Short EPG (Electronic Program Guide)
 * Restituisce EPG semplificato per i canali live
 */
export async function getShortEPG(streamId?: string): Promise<any[]> {
  // Per ora restituisce array vuoto
  // L'EPG completo è disponibile tramite xmltv.php
  return [];
}

/**
 * Get EPG (Electronic Program Guide)
 * Restituisce EPG completo per un canale specifico
 */
export async function getEPG(streamId: string): Promise<any> {
  // Per ora restituisce oggetto vuoto
  // L'EPG completo è disponibile tramite xmltv.php
  return {};
}

/**
 * Get Series Info
 * Restituisce informazioni dettagliate di una serie e i suoi episodi
 */
export async function getSeriesInfo(seriesId: string): Promise<SeriesInfo | null> {
  const series = await getSeries();
  const seriesItem = series.find(s => s.series_id === seriesId);
  
  if (!seriesItem) {
    return null;
  }

  // Cerca tutti gli episodi della serie
  const allStreams = await parseM3UAsync(config.playlists.series);
  const episodes: Episode[] = [];
  
  allStreams.forEach((stream, idx) => {
    const name = stream.name;
    const seriesMatch = name.match(/^(.+?)\s+S(\d+)\s+E(\d+)/i);
    if (seriesMatch) {
      const seriesName = seriesMatch[1].trim();
      if (seriesName === seriesItem.name) {
        const seasonNum = parseInt(seriesMatch[2], 10);
        const episodeNum = parseInt(seriesMatch[3], 10);
        const streamId = extractStreamId(stream.url) || String(idx + 1);
        const urlParts = stream.url.split('.');
        const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1] : 'mkv';

        episodes.push({
          id: streamId,
          episode_num: String(episodeNum),
          title: name,
          container_extension: extension,
          info: {
            plot: '',
            cast: '',
            director: '',
            genre: seriesItem.genre,
            releaseDate: seriesItem.releaseDate,
            rating: seriesItem.rating,
            duration_secs: seriesItem.episode_run_time || '0',
          },
          added: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
          season: seasonNum,
          direct_source: stream.url,
        });
      }
    }
  });

  // Raggruppa per stagione
  const seasonsMap = new Map<number, Episode[]>();
  episodes.forEach(ep => {
    if (!seasonsMap.has(ep.season)) {
      seasonsMap.set(ep.season, []);
    }
    seasonsMap.get(ep.season)!.push(ep);
  });

  const seasons = Array.from(seasonsMap.entries()).map(([seasonNum, eps]) => ({
    air_date: seriesItem.releaseDate,
    episode_count: eps.length,
    id: seasonNum,
    name: `Season ${seasonNum}`,
    overview: '',
    season_number: seasonNum,
    cover: seriesItem.cover,
    episodes: eps.sort((a, b) => parseInt(a.episode_num, 10) - parseInt(b.episode_num, 10)),
  }));

  return {
    ...seriesItem,
    seasons: seasons.sort((a, b) => a.season_number - b.season_number),
  };
}

/**
 * Get Series Streams
 * Restituisce tutti gli episodi di una serie
 */
export async function getSeriesStreams(seriesId: string): Promise<Episode[]> {
  const seriesInfo = await getSeriesInfo(seriesId);
  if (!seriesInfo) {
    return [];
  }

  const episodes: Episode[] = [];
  seriesInfo.seasons.forEach(season => {
    episodes.push(...season.episodes);
  });

  return episodes;
}

/**
 * Get VOD Info
 * Restituisce informazioni dettagliate di un film VOD
 */
export async function getVODInfo(vodId: string): Promise<VODInfo | null> {
  const vods = await getVODStreams();
  const vod = vods.find(v => v.stream_id === vodId);
  
  if (!vod) {
    return null;
  }

  return {
    ...vod,
    info: {
      plot: '',
      cast: '',
      director: '',
      genre: vod.category_name,
      releaseDate: vod.added.split(' ')[0],
      rating: vod.rating,
      duration_secs: '0',
    },
  };
}

