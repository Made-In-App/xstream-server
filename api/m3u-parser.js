"use strict";
/**
 * M3U Playlist Parser
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
exports.parseM3UAsync = parseM3UAsync;
exports.parseM3U = parseM3U;
exports.extractStreamId = extractStreamId;
exports.clearCache = clearCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("./config");
// Cache for parsed playlists (in-memory)
const playlistCache = new Map();
/**
 * Parse M3U playlist file
 * Se il file non esiste, prova a scaricarlo dal server Xtream
 */
async function parseM3UAsync(filePath) {
    const fullPath = path.resolve(filePath);
    // Check in-memory cache
    if (config_1.config.cache.enabled) {
        const cached = playlistCache.get(fullPath);
        if (cached) {
            const now = Date.now();
            if (now - cached.timestamp < config_1.config.cache.ttl * 1000) {
                return cached.streams;
            }
        }
    }
    // Determina il tipo di playlist dal path
    let playlistType = null;
    if (filePath.includes('LIVE') || filePath.includes('live')) {
        playlistType = 'live';
    }
    else if (filePath.includes('VOD') || filePath.includes('vod')) {
        playlistType = 'vod';
    }
    else if (filePath.includes('SERIES') || filePath.includes('series')) {
        playlistType = 'series';
    }
    let content;
    // Se il file esiste, usalo, altrimenti scarica dal server Xtream
    if (fs.existsSync(fullPath)) {
        content = fs.readFileSync(fullPath, 'utf-8');
    }
    else if (playlistType) {
        // Prova a scaricare dal server Xtream usando le credenziali statiche
        try {
            const { getPlaylistContent } = await Promise.resolve().then(() => __importStar(require('./playlist-downloader')));
            content = await getPlaylistContent(playlistType);
        }
        catch (error) {
            console.warn(`Could not download playlist from Xtream: ${error}`);
            return [];
        }
    }
    else {
        console.warn(`Playlist file not found and type unknown: ${fullPath}`);
        return [];
    }
    const lines = content.split('\n');
    const streams = [];
    let currentStream = null;
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
        }
        else if (trimmed && trimmed.startsWith('http') && currentStream) {
            // URL line
            currentStream.url = trimmed;
            streams.push(currentStream);
            currentStream = null;
        }
    }
    // Update in-memory cache
    if (config_1.config.cache.enabled) {
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
function parseM3U(filePath) {
    const fullPath = path.resolve(filePath);
    // Check in-memory cache
    if (config_1.config.cache.enabled) {
        const cached = playlistCache.get(fullPath);
        if (cached) {
            const now = Date.now();
            if (now - cached.timestamp < config_1.config.cache.ttl * 1000) {
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
    const streams = [];
    let currentStream = null;
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
        }
        else if (trimmed && trimmed.startsWith('http') && currentStream) {
            // URL line
            currentStream.url = trimmed;
            streams.push(currentStream);
            currentStream = null;
        }
    }
    // Update in-memory cache
    if (config_1.config.cache.enabled) {
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
function extractName(extinf) {
    // Format: #EXTINF:-1,Name or #EXTINF:-1 tvg-id="..." tvg-name="...",Name
    const match = extinf.match(/,([^,]+)$/);
    return match ? match[1].trim() : '';
}
/**
 * Extract attribute from EXTINF line
 */
function extractAttribute(extinf, attr) {
    const regex = new RegExp(`${attr}="([^"]+)"`);
    const match = extinf.match(regex);
    return match ? match[1] : undefined;
}
/**
 * Extract stream ID from URL
 */
function extractStreamId(url) {
    // Format: http://server:port/username/password/ID
    // or: http://server:port/movie/username/password/ID.ext
    // or: http://server:port/series/username/password/ID.ext
    const match = url.match(/(?:\/movie\/|\/series\/|\/)(?:[^\/]+\/){2}([^\/\.]+)/);
    return match ? match[1] : '';
}
/**
 * Clear playlist cache
 */
function clearCache() {
    playlistCache.clear();
}
//# sourceMappingURL=m3u-parser.js.map