/**
 * Configuration for Xtream Server
 */

import * as fs from 'fs';
import * as path from 'path';

// Carica variabili d'ambiente da file .env se presente (solo in sviluppo locale)
// Su Vercel le variabili vengono caricate automaticamente dalla dashboard
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // Ignora se dotenv non è disponibile
  }
}

// Carica .env.production se presente (per deploy locali)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  try {
    require('dotenv').config({ path: '.env.production' });
  } catch (e) {
    // Ignora se dotenv non è disponibile o file non esiste
  }
}

export interface Config {
  // Credenziali per accedere al server Xtream originale (statiche)
  xtream: {
    url: string;
    username: string;
    password: string;
  };
  // URL del proxy (se non specificato, viene dedotto dalla richiesta)
  proxy: {
    url: string; // URL base del proxy (es. https://mio-proxy.vercel.app)
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
    // Crea file di configurazione di esempio solo se il filesystem è scrivibile
    // Su Vercel il filesystem è read-only, quindi saltiamo la creazione
    try {
      createExampleConfig(configPath);
    } catch (error) {
      // Ignora errori di scrittura (filesystem read-only su Vercel)
      // La configurazione userà i default o le variabili d'ambiente
    }
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
    proxy: {
      url: process.env.PROXY_URL || '', // Se vuoto, viene dedotto dalla richiesta
    },
    auth: {
      enabled: true,
      users: (() => {
        // Permetti configurazione tramite variabili d'ambiente
        const users: Record<string, string> = {};
        
        // Credenziali da variabili d'ambiente (formato: USER1:PASS1,USER2:PASS2)
        if (process.env.AUTH_USERS) {
          process.env.AUTH_USERS.split(',').forEach(pair => {
            const [user, pass] = pair.split(':');
            if (user && pass) {
              users[user.trim()] = pass.trim();
            }
          });
        }
        
        // Default se non configurato
        if (Object.keys(users).length === 0) {
          users['user'] = process.env.AUTH_PASSWORD || 'pass';
          if (process.env.AUTH_USERNAME && process.env.AUTH_USERNAME !== 'user') {
            users[process.env.AUTH_USERNAME] = process.env.AUTH_PASSWORD || 'pass';
            delete users['user'];
          }
        }
        
        // Fallback ai default se ancora vuoto
        if (Object.keys(users).length === 0) {
          users['user'] = 'pass';
          users['admin'] = 'admin123';
        }
        
        return users;
      })(),
    },
    cache: {
      enabled: true,
      ttl: 3600, // 1 hour
      directory: process.env.CACHE_DIR || (process.env.VERCEL ? '/tmp/cache' : './cache'),
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
  // Non creare il file su Vercel (filesystem read-only)
  if (process.env.VERCEL) {
    return;
  }
  
  const exampleConfig = {
    xtream: {
      url: 'https://fn2ilpirata.rearc.xn--t60b56a',
      username: 'Emmgen2',
      password: 'gJWB28F',
      comment: 'Credenziali per accedere al server Xtream originale (statiche)',
    },
    proxy: {
      url: 'https://mio-proxy.vercel.app',
      comment: 'URL base del proxy (se vuoto, viene dedotto dalla richiesta)',
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
      directory: process.env.VERCEL ? '/tmp/cache' : './cache',
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
    // Ignora errori di scrittura (filesystem read-only)
    // La configurazione userà i default o le variabili d'ambiente
  }
}

export const config: Config = loadConfig();

// Assicura che la directory cache esista (solo se scrivibile)
if (config.cache.enabled && config.cache.directory) {
  try {
    const cacheDir = path.resolve(config.cache.directory);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  } catch (error) {
    // Ignora errori se il filesystem è read-only (su Vercel)
    console.warn('Could not create cache directory, using in-memory cache only:', error);
  }
}

// Assicura che la directory playlists esista (solo se scrivibile)
try {
  const playlistsDir = path.resolve('./playlists');
  if (!fs.existsSync(playlistsDir)) {
    fs.mkdirSync(playlistsDir, { recursive: true });
  }
} catch (error) {
  // Ignora errori se il filesystem è read-only (su Vercel)
  // Le playlist verranno scaricate direttamente dal server Xtream
}

/**
 * Check if user credentials are valid
 * Richiede sempre username e password, restituisce errore se mancanti o invalidi
 */
export function checkAuth(username: string, password: string): { valid: boolean; error?: string } {
  // Richiedi sempre username e password
  if (!username || !password) {
    logAccess(`Auth failed: Missing credentials - username: ${username ? 'provided' : 'missing'}, password: ${password ? 'provided' : 'missing'}`);
    return {
      valid: false,
      error: 'Username and password are required'
    };
  }
  
  // Debug: log degli utenti disponibili (solo i nomi, non le password)
  const availableUsers = Object.keys(config.auth.users);
  
  // Verifica le credenziali (sempre richiesta, anche se auth.enabled è false)
  const expectedPassword = config.auth.users[username];
  const isValid = expectedPassword === password;
  
  if (!isValid) {
    if (!expectedPassword) {
      logAccess(`Auth failed: User "${username}" not found. Available users: [${availableUsers.join(', ')}]`);
    } else {
      logAccess(`Auth failed: Invalid password for user "${username}"`);
    }
    return {
      valid: false,
      error: 'Invalid username or password'
    };
  }
  
  logAccess(`Auth successful: User "${username}" authenticated`);
  return { valid: true };
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
