/**
 * Download and cache playlists from Xtream server
 */
/**
 * Get playlist content (from cache or download)
 */
export declare function getPlaylistContent(type: 'live' | 'vod' | 'series'): Promise<string>;
/**
 * Refresh playlist cache (force download)
 */
export declare function refreshPlaylistCache(type: 'live' | 'vod' | 'series'): Promise<void>;
/**
 * Get cache info
 */
export declare function getCacheInfo(type: 'live' | 'vod' | 'series'): {
    exists: boolean;
    valid: boolean;
    age: number | null;
    size: number | null;
};
//# sourceMappingURL=playlist-downloader.d.ts.map