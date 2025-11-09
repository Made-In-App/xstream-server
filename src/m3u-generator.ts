/**
 * M3U Playlist Generator
 */

import { config } from './config';
import { getPlaylistContent } from './playlist-downloader';
import * as fs from 'fs';

/**
 * Generate M3U playlist content
 */
export async function generateM3U(type: 'm3u' | 'm3u_plus'): Promise<string> {
  let content = '#EXTM3U\n';

  if (type === 'm3u') {
    // Only live streams
    try {
      const liveContent = await getPlaylistContent('live');
      content += liveContent;
    } catch (error) {
      // Fallback to file if exists
      if (fs.existsSync(config.playlists.live)) {
        content += fs.readFileSync(config.playlists.live, 'utf-8');
      }
    }
  } else if (type === 'm3u_plus') {
    // Live + VOD + Series
    try {
      const liveContent = await getPlaylistContent('live');
      content += liveContent + '\n';
    } catch (error) {
      if (fs.existsSync(config.playlists.live)) {
        content += fs.readFileSync(config.playlists.live, 'utf-8') + '\n';
      }
    }

    try {
      const vodContent = await getPlaylistContent('vod');
      content += vodContent + '\n';
    } catch (error) {
      if (fs.existsSync(config.playlists.vod)) {
        content += fs.readFileSync(config.playlists.vod, 'utf-8') + '\n';
      }
    }

    try {
      const seriesContent = await getPlaylistContent('series');
      content += seriesContent + '\n';
    } catch (error) {
      if (fs.existsSync(config.playlists.series)) {
        content += fs.readFileSync(config.playlists.series, 'utf-8') + '\n';
      }
    }
  }

  return content;
}

