/**
 * Configuration for Xtream Server
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Config {
  // Credenziali per accedere al server Xtream originale (statiche)
  xtream: {
    url: string;
    username: string;
    password: string;
  };
  // Credenziali per accedere al nostro server (configurabili)
  auth: {
    enabled: boolean;
    users: Record<string, string>;
  };
  cache: {
    enabled: boolean;
    ttl: number; // seconds
    directory: string; // directory per cache su file
  };
  playlists: {
    live: string;
    vod: string;
    series: string;
  };
  logging: {
    enabled: boolean;
  };
}

// Carica configurazione da file o usa default
function loadConfig(): Config {
  const configPath = path.join(process.cwd(), 'xtream-config.json');
  
  let config: Config;
  
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(configData);
      config = {
        ...getDefaultConfig(),
        ...fileConfig,
      };
    } catch (error) {
      console.warn('Error loading config file, using defaults:', error);
      config = getDefaultConfig();
    }
  } else {
    config = getDefaultConfig();
    // Crea file di configurazione di esempio
    createExampleConfig(configPath);
  }
  
  return config;
}

function getDefaultConfig(): Config {
  return {
    xtream: {
      url: process.env.XSTREAM_URL || 'https://fn2ilpirata.rearc.xn--t60b56a',
      username: process.env.XSTREAM_USERNAME || 'Emmgen2',
      password: process.env.XSTREAM_PASSWORD || 'gJWB28F',
    },
    auth: {
      enabled: true,
      users: {
        user: 'pass',
        admin: 'admin123',
      },
    },
    cache: {
      enabled: true,
      ttl: 3600, // 1 hour
      directory: process.env.CACHE_DIR || './cache',
    },
    playlists: {
      live: process.env.LIVE_M3U_PATH || './playlists/xtream_Emmgen2_LIVE.m3u',
      vod: process.env.VOD_M3U_PATH || './playlists/xtream_Emmgen2_VOD.m3u',
      series: process.env.SERIES_M3U_PATH || './playlists/xtream_Emmgen2_SERIES.m3u',
    },
    logging: {
      enabled: true,
    },
  };
}

function createExampleConfig(configPath: string): void {
  const exampleConfig = {
    xtream: {
      url: 'https://fn2ilpirata.rearc.xn--t60b56a',
      username: 'Emmgen2',
      password: 'gJWB28F',
      comment: 'Credenziali per accedere al server Xtream originale (statiche)',
    },
    auth: {
      enabled: true,
      users: {
        user: 'pass',
        admin: 'admin123',
        comment: 'Credenziali per accedere al nostro server (configurabili)',
      },
    },
    cache: {
      enabled: true,
      ttl: 3600,
      directory: './cache',
    },
    playlists: {
      live: './playlists/xtream_Emmgen2_LIVE.m3u',
      vod: './playlists/xtream_Emmgen2_VOD.m3u',
      series: './playlists/xtream_Emmgen2_SERIES.m3u',
    },
    logging: {
      enabled: true,
    },
  };
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
    console.log(`Created example config file: ${configPath}`);
  } catch (error) {
    console.warn('Could not create example config file:', error);
  }
}

export const config: Config = loadConfig();

// Assicura che la directory cache esista
if (config.cache.enabled && config.cache.directory) {
  const cacheDir = path.resolve(config.cache.directory);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

// Assicura che la directory playlists esista
const playlistsDir = path.resolve('./playlists');
if (!fs.existsSync(playlistsDir)) {
  fs.mkdirSync(playlistsDir, { recursive: true });
}

/**
 * Check if user credentials are valid
 */
export function checkAuth(username: string, password: string): boolean {
  if (!config.auth.enabled) {
    return true;
  }
  return config.auth.users[username] === password;
}

/**
 * Log access (can be extended to write to file or external service)
 */
export function logAccess(message: string): void {
  if (config.logging.enabled) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
}
