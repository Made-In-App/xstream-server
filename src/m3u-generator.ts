/**
 * M3U Playlist Generator
 */

import { config } from './config';
import { getPlaylistContent } from './playlist-downloader';
import * as fs from 'fs';

/**
 * Clean M3U content - rimuove #EXTM3U duplicati e normalizza
 */
function cleanM3UContent(content: string): string {
  // Rimuovi #EXTM3U se presente (lo aggiungeremo noi)
  let cleaned = content.trim();
  if (cleaned.startsWith('#EXTM3U')) {
    cleaned = cleaned.substring(cleaned.indexOf('\n') + 1).trim();
  }
  return cleaned;
}

/**
 * Generate M3U playlist content
 */
export async function generateM3U(type: 'm3u' | 'm3u_plus'): Promise<string> {
  let content = '#EXTM3U\n';

  if (type === 'm3u') {
    // Only live streams
    try {
      const liveContent = await getPlaylistContent('live');
      const cleaned = cleanM3UContent(liveContent);
      content += cleaned;
      if (!cleaned.endsWith('\n')) {
        content += '\n';
      }
    } catch (error) {
      console.error('Error getting live content:', error);
      // Fallback to file if exists
      if (fs.existsSync(config.playlists.live)) {
        const fileContent = fs.readFileSync(config.playlists.live, 'utf-8');
        const cleaned = cleanM3UContent(fileContent);
        content += cleaned;
        if (!cleaned.endsWith('\n')) {
          content += '\n';
        }
      }
    }
  } else if (type === 'm3u_plus') {
    // Live + VOD + Series
    try {
      const liveContent = await getPlaylistContent('live');
      const cleaned = cleanM3UContent(liveContent);
      content += cleaned;
      if (!cleaned.endsWith('\n')) {
        content += '\n';
      }
    } catch (error) {
      console.error('Error getting live content:', error);
      if (fs.existsSync(config.playlists.live)) {
        const fileContent = fs.readFileSync(config.playlists.live, 'utf-8');
        const cleaned = cleanM3UContent(fileContent);
        content += cleaned;
        if (!cleaned.endsWith('\n')) {
          content += '\n';
        }
      }
    }

    try {
      const vodContent = await getPlaylistContent('vod');
      const cleaned = cleanM3UContent(vodContent);
      content += cleaned;
      if (!cleaned.endsWith('\n')) {
        content += '\n';
      }
    } catch (error) {
      console.error('Error getting vod content:', error);
      if (fs.existsSync(config.playlists.vod)) {
        const fileContent = fs.readFileSync(config.playlists.vod, 'utf-8');
        const cleaned = cleanM3UContent(fileContent);
        content += cleaned;
        if (!cleaned.endsWith('\n')) {
          content += '\n';
        }
      }
    }

    try {
      const seriesContent = await getPlaylistContent('series');
      const cleaned = cleanM3UContent(seriesContent);
      content += cleaned;
      if (!cleaned.endsWith('\n')) {
        content += '\n';
      }
    } catch (error) {
      console.error('Error getting series content:', error);
      if (fs.existsSync(config.playlists.series)) {
        const fileContent = fs.readFileSync(config.playlists.series, 'utf-8');
        const cleaned = cleanM3UContent(fileContent);
        content += cleaned;
        if (!cleaned.endsWith('\n')) {
          content += '\n';
        }
      }
    }
  }

  return content.trim() + '\n';
}

