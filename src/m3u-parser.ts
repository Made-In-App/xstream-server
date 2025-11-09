/**
 * M3U Playlist Parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { Stream } from './types';
import { config } from './config';

// Cache for parsed playlists (in-memory)
const playlistCache: Map<string, { streams: Stream[]; timestamp: number }> = new Map();

/**
 * Parse M3U playlist file
 * Se il file non esiste, prova a scaricarlo dal server Xtream
 */
export async function parseM3UAsync(filePath: string): Promise<Stream[]> {
  const fullPath = path.resolve(filePath);
  
  // Check in-memory cache
  if (config.cache.enabled) {
    const cached = playlistCache.get(fullPath);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < config.cache.ttl * 1000) {
        return cached.streams;
      }
    }
  }

  // Determina il tipo di playlist dal path
  let playlistType: 'live' | 'vod' | 'series' | null = null;
  if (filePath.includes('LIVE') || filePath.includes('live')) {
    playlistType = 'live';
  } else if (filePath.includes('VOD') || filePath.includes('vod')) {
    playlistType = 'vod';
  } else if (filePath.includes('SERIES') || filePath.includes('series')) {
    playlistType = 'series';
  }

  let content: string;

  // Se il file esiste, usalo, altrimenti scarica dal server Xtream
  if (fs.existsSync(fullPath)) {
    content = fs.readFileSync(fullPath, 'utf-8');
  } else if (playlistType) {
    // Prova a scaricare dal server Xtream usando le credenziali statiche
    try {
      const { getPlaylistContent } = await import('./playlist-downloader');
      content = await getPlaylistContent(playlistType);
      // Se il contenuto è vuoto o contiene solo spazi, restituisci array vuoto
      if (!content || content.trim().length === 0) {
        console.warn(`Downloaded playlist is empty for type: ${playlistType}`);
        return [];
      }
    } catch (error) {
      console.warn(`Could not download playlist from Xtream: ${error}`);
      return [];
    }
  } else {
    console.warn(`Playlist file not found and type unknown: ${fullPath}`);
    return [];
  }
  
  // Se il contenuto è vuoto dopo il download, restituisci array vuoto
  if (!content || content.trim().length === 0) {
    return [];
  }

  const lines = content.split('\n');

  const streams: Stream[] = [];
  let currentStream: Partial<Stream> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#EXTINF')) {
      // Parse EXTINF line
      currentStream = {
        extinf: trimmed,
        name: extractName(trimmed),
        tvgId: extractAttribute(trimmed, 'tvg-id'),
        tvgName: extractAttribute(trimmed, 'tvg-name'),
        tvgLogo: extractAttribute(trimmed, 'tvg-logo'),
        groupTitle: extractAttribute(trimmed, 'group-title'),
        url: '',
      };
    } else if (trimmed && trimmed.startsWith('http') && currentStream) {
      // URL line
      currentStream.url = trimmed;
      streams.push(currentStream as Stream);
      currentStream = null;
    }
  }

  // Update in-memory cache
  if (config.cache.enabled) {
    playlistCache.set(fullPath, {
      streams,
      timestamp: Date.now(),
    });
  }

  return streams;
}

/**
 * Parse M3U playlist file (synchronous version for backward compatibility)
 */
export function parseM3U(filePath: string): Stream[] {
  const fullPath = path.resolve(filePath);
  
  // Check in-memory cache
  if (config.cache.enabled) {
    const cached = playlistCache.get(fullPath);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < config.cache.ttl * 1000) {
        return cached.streams;
      }
    }
  }

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    console.warn(`Playlist file not found: ${fullPath}`);
    return [];
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  const streams: Stream[] = [];
  let currentStream: Partial<Stream> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#EXTINF')) {
      // Parse EXTINF line
      currentStream = {
        extinf: trimmed,
        name: extractName(trimmed),
        tvgId: extractAttribute(trimmed, 'tvg-id'),
        tvgName: extractAttribute(trimmed, 'tvg-name'),
        tvgLogo: extractAttribute(trimmed, 'tvg-logo'),
        groupTitle: extractAttribute(trimmed, 'group-title'),
        url: '',
      };
    } else if (trimmed && trimmed.startsWith('http') && currentStream) {
      // URL line
      currentStream.url = trimmed;
      streams.push(currentStream as Stream);
      currentStream = null;
    }
  }

  // Update in-memory cache
  if (config.cache.enabled) {
    playlistCache.set(fullPath, {
      streams,
      timestamp: Date.now(),
    });
  }

  return streams;
}

/**
 * Extract name from EXTINF line
 */
function extractName(extinf: string): string {
  // Format: #EXTINF:-1,Name or #EXTINF:-1 tvg-id="..." tvg-name="...",Name
  const match = extinf.match(/,([^,]+)$/);
  return match ? match[1].trim() : '';
}

/**
 * Extract attribute from EXTINF line
 */
function extractAttribute(extinf: string, attr: string): string | undefined {
  const regex = new RegExp(`${attr}="([^"]+)"`);
  const match = extinf.match(regex);
  return match ? match[1] : undefined;
}

/**
 * Extract stream ID from URL
 */
export function extractStreamId(url: string): string {
  // Format: http://server:port/username/password/ID
  // or: http://server:port/movie/username/password/ID.ext
  // or: http://server:port/series/username/password/ID.ext
  const match = url.match(/(?:\/movie\/|\/series\/|\/)(?:[^\/]+\/){2}([^\/\.]+)/);
  return match ? match[1] : '';
}

/**
 * Clear playlist cache
 */
export function clearCache(): void {
  playlistCache.clear();
}

