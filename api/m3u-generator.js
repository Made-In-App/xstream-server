"use strict";
/**
 * M3U Playlist Generator
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
exports.generateM3U = generateM3U;
const config_1 = require("./config");
const playlist_downloader_1 = require("./playlist-downloader");
const fs = __importStar(require("fs"));
/**
 * Generate M3U playlist content
 */
async function generateM3U(type) {
    let content = '#EXTM3U\n';
    if (type === 'm3u') {
        // Only live streams
        try {
            const liveContent = await (0, playlist_downloader_1.getPlaylistContent)('live');
            content += liveContent;
        }
        catch (error) {
            // Fallback to file if exists
            if (fs.existsSync(config_1.config.playlists.live)) {
                content += fs.readFileSync(config_1.config.playlists.live, 'utf-8');
            }
        }
    }
    else if (type === 'm3u_plus') {
        // Live + VOD + Series
        try {
            const liveContent = await (0, playlist_downloader_1.getPlaylistContent)('live');
            content += liveContent + '\n';
        }
        catch (error) {
            if (fs.existsSync(config_1.config.playlists.live)) {
                content += fs.readFileSync(config_1.config.playlists.live, 'utf-8') + '\n';
            }
        }
        try {
            const vodContent = await (0, playlist_downloader_1.getPlaylistContent)('vod');
            content += vodContent + '\n';
        }
        catch (error) {
            if (fs.existsSync(config_1.config.playlists.vod)) {
                content += fs.readFileSync(config_1.config.playlists.vod, 'utf-8') + '\n';
            }
        }
        try {
            const seriesContent = await (0, playlist_downloader_1.getPlaylistContent)('series');
            content += seriesContent + '\n';
        }
        catch (error) {
            if (fs.existsSync(config_1.config.playlists.series)) {
                content += fs.readFileSync(config_1.config.playlists.series, 'utf-8') + '\n';
            }
        }
    }
    return content;
}
//# sourceMappingURL=m3u-generator.js.map