/**
 * Download and cache playlists from Xtream server
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { config } from './config';
import { logAccess } from './config';

interface CacheMetadata {
  timestamp: number;
  filePath: string;
  size: number;
}

/**
 * Download playlist from Xtream server
 */
async function downloadPlaylist(type: 'live' | 'vod' | 'series'): Promise<string> {
  const { url, username, password } = config.xtream;
  
  let endpoint = '';
  switch (type) {
    case 'live':
      endpoint = `${url}/get.php?username=${username}&password=${password}&type=m3u`;
      break;
    case 'vod':
      endpoint = `${url}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`;
      break;
    case 'series':
      endpoint = `${url}/get.php?username=${username}&password=${password}&type=m3u_plus&output=mkv`;
      break;
  }

  logAccess(`Downloading ${type} playlist from Xtream server...`);

  return new Promise((resolve, reject) => {
    const isHttps = endpoint.startsWith('https');
    const client = isHttps ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'VLC/3.0.0',
      },
    };

    const req = client.get(endpoint, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Get cache file path for a playlist type
 */
function getCacheFilePath(type: 'live' | 'vod' | 'series'): string {
  const cacheDir = path.resolve(config.cache.directory);
  return path.join(cacheDir, `${type}.m3u`);
}

/**
 * Get cache metadata file path
 */
function getCacheMetadataPath(type: 'live' | 'vod' | 'series'): string {
  const cacheDir = path.resolve(config.cache.directory);
  return path.join(cacheDir, `${type}.meta.json`);
}

/**
 * Load cache metadata
 */
function loadCacheMetadata(type: 'live' | 'vod' | 'series'): CacheMetadata | null {
  const metaPath = getCacheMetadataPath(type);
  
  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    const metaData = fs.readFileSync(metaPath, 'utf-8');
    return JSON.parse(metaData);
  } catch (error) {
    logAccess(`Error loading cache metadata for ${type}: ${error}`);
    return null;
  }
}

/**
 * Save cache metadata
 */
function saveCacheMetadata(type: 'live' | 'vod' | 'series', filePath: string, size: number): void {
  const metaPath = getCacheMetadataPath(type);
  const metadata: CacheMetadata = {
    timestamp: Date.now(),
    filePath,
    size,
  };

  try {
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    logAccess(`Error saving cache metadata for ${type}: ${error}`);
  }
}

/**
 * Check if cache exists (senza TTL, la cache persiste fino al purge manuale)
 */
function isCacheValid(type: 'live' | 'vod' | 'series'): boolean {
  if (!config.cache.enabled) {
    return false;
  }

  const cacheFilePath = getCacheFilePath(type);
  
  // Verifica solo che il file esista (non controlla TTL)
  if (!fs.existsSync(cacheFilePath)) {
    return false;
  }

  return true;
}

/**
 * Get playlist content (from cache or download)
 * Scarica solo se i file non esistono (cache persiste fino al purge manuale)
 */
export async function getPlaylistContent(type: 'live' | 'vod' | 'series'): Promise<string> {
  const cacheFilePath = getCacheFilePath(type);

  // Se la cache esiste, usa quella (non controlla TTL, persiste fino al purge)
  if (isCacheValid(type)) {
    logAccess(`Using cached ${type} playlist`);
    try {
      return fs.readFileSync(cacheFilePath, 'utf-8');
    } catch (error) {
      logAccess(`Error reading cache for ${type}: ${error}`);
      // Continua con il download se errore di lettura
    }
  }

  // Download nuovo solo se i file non esistono
  logAccess(`Cache missing for ${type}, downloading from Xtream server...`);
  const content = await downloadPlaylist(type);

  // Salva in cache
  try {
    fs.writeFileSync(cacheFilePath, content, 'utf-8');
    saveCacheMetadata(type, cacheFilePath, content.length);
    logAccess(`Cached ${type} playlist (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    logAccess(`Error saving cache for ${type}: ${error}`);
  }

  return content;
}

/**
 * Refresh playlist cache (force download)
 */
export async function refreshPlaylistCache(type: 'live' | 'vod' | 'series'): Promise<void> {
  logAccess(`Force refreshing ${type} playlist cache...`);
  const content = await downloadPlaylist(type);
  const cacheFilePath = getCacheFilePath(type);

  try {
    fs.writeFileSync(cacheFilePath, content, 'utf-8');
    saveCacheMetadata(type, cacheFilePath, content.length);
    logAccess(`Refreshed ${type} playlist cache`);
  } catch (error) {
    logAccess(`Error refreshing cache for ${type}: ${error}`);
    throw error;
  }
}

/**
 * Get cache info
 */
export function getCacheInfo(type: 'live' | 'vod' | 'series'): {
  exists: boolean;
  valid: boolean;
  age: number | null;
  size: number | null;
} {
  const metadata = loadCacheMetadata(type);
  const cacheFilePath = getCacheFilePath(type);
  const exists = fs.existsSync(cacheFilePath);

  if (!metadata || !exists) {
    return {
      exists: false,
      valid: false,
      age: null,
      size: null,
    };
  }

  const now = Date.now();
  const age = now - metadata.timestamp;
  // La cache è sempre valida se esiste (non usa più TTL)
  const valid = exists;

  let size: number | null = null;
  try {
    const stats = fs.statSync(cacheFilePath);
    size = stats.size;
  } catch (error) {
    // Ignore
  }

  return {
    exists: true,
    valid,
    age: Math.floor(age / 1000), // in seconds
    size,
  };
}

/**
 * Purge cache (delete cache files)
 */
export async function purgeCache(type: 'live' | 'vod' | 'series'): Promise<boolean> {
  const cacheFilePath = getCacheFilePath(type);
  const metaPath = getCacheMetadataPath(type);
  
  let purged = false;
  
  try {
    if (fs.existsSync(cacheFilePath)) {
      fs.unlinkSync(cacheFilePath);
      purged = true;
      logAccess(`Purged cache file for ${type}`);
    }
    
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
      logAccess(`Purged cache metadata for ${type}`);
    }
  } catch (error) {
    logAccess(`Error purging cache for ${type}: ${error}`);
    throw error;
  }
  
  return purged;
}

