"use strict";
/**
 * Download and cache playlists from Xtream server
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaylistContent = getPlaylistContent;
exports.refreshPlaylistCache = refreshPlaylistCache;
exports.getCacheInfo = getCacheInfo;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const config_1 = require("./config");
const config_2 = require("./config");
/**
 * Download playlist from Xtream server
 */
async function downloadPlaylist(type) {
    const { url, username, password } = config_1.config.xtream;
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
    (0, config_2.logAccess)(`Downloading ${type} playlist from Xtream server...`);
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
function getCacheFilePath(type) {
    const cacheDir = path.resolve(config_1.config.cache.directory);
    return path.join(cacheDir, `${type}.m3u`);
}
/**
 * Get cache metadata file path
 */
function getCacheMetadataPath(type) {
    const cacheDir = path.resolve(config_1.config.cache.directory);
    return path.join(cacheDir, `${type}.meta.json`);
}
/**
 * Load cache metadata
 */
function loadCacheMetadata(type) {
    const metaPath = getCacheMetadataPath(type);
    if (!fs.existsSync(metaPath)) {
        return null;
    }
    try {
        const metaData = fs.readFileSync(metaPath, 'utf-8');
        return JSON.parse(metaData);
    }
    catch (error) {
        (0, config_2.logAccess)(`Error loading cache metadata for ${type}: ${error}`);
        return null;
    }
}
/**
 * Save cache metadata
 */
function saveCacheMetadata(type, filePath, size) {
    const metaPath = getCacheMetadataPath(type);
    const metadata = {
        timestamp: Date.now(),
        filePath,
        size,
    };
    try {
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    }
    catch (error) {
        (0, config_2.logAccess)(`Error saving cache metadata for ${type}: ${error}`);
    }
}
/**
 * Check if cache is valid
 */
function isCacheValid(type) {
    if (!config_1.config.cache.enabled) {
        return false;
    }
    const metadata = loadCacheMetadata(type);
    if (!metadata) {
        return false;
    }
    const now = Date.now();
    const age = now - metadata.timestamp;
    const ttl = config_1.config.cache.ttl * 1000;
    if (age > ttl) {
        return false;
    }
    // Verifica che il file esista ancora
    if (!fs.existsSync(metadata.filePath)) {
        return false;
    }
    return true;
}
/**
 * Get playlist content (from cache or download)
 */
async function getPlaylistContent(type) {
    const cacheFilePath = getCacheFilePath(type);
    // Se la cache è valida, usa quella
    if (isCacheValid(type)) {
        (0, config_2.logAccess)(`Using cached ${type} playlist`);
        try {
            return fs.readFileSync(cacheFilePath, 'utf-8');
        }
        catch (error) {
            (0, config_2.logAccess)(`Error reading cache for ${type}: ${error}`);
            // Continua con il download
        }
    }
    // Download nuovo
    (0, config_2.logAccess)(`Cache expired or missing for ${type}, downloading...`);
    const content = await downloadPlaylist(type);
    // Salva in cache
    try {
        fs.writeFileSync(cacheFilePath, content, 'utf-8');
        saveCacheMetadata(type, cacheFilePath, content.length);
        (0, config_2.logAccess)(`Cached ${type} playlist (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
    }
    catch (error) {
        (0, config_2.logAccess)(`Error saving cache for ${type}: ${error}`);
    }
    return content;
}
/**
 * Refresh playlist cache (force download)
 */
async function refreshPlaylistCache(type) {
    (0, config_2.logAccess)(`Force refreshing ${type} playlist cache...`);
    const content = await downloadPlaylist(type);
    const cacheFilePath = getCacheFilePath(type);
    try {
        fs.writeFileSync(cacheFilePath, content, 'utf-8');
        saveCacheMetadata(type, cacheFilePath, content.length);
        (0, config_2.logAccess)(`Refreshed ${type} playlist cache`);
    }
    catch (error) {
        (0, config_2.logAccess)(`Error refreshing cache for ${type}: ${error}`);
        throw error;
    }
}
/**
 * Get cache info
 */
function getCacheInfo(type) {
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
    const valid = age < config_1.config.cache.ttl * 1000;
    let size = null;
    try {
        const stats = fs.statSync(cacheFilePath);
        size = stats.size;
    }
    catch (error) {
        // Ignore
    }
    return {
        exists: true,
        valid,
        age: Math.floor(age / 1000), // in seconds
        size,
    };
}
//# sourceMappingURL=playlist-downloader.js.map