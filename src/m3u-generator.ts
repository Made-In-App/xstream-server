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
 * Rewrite M3U URLs to point to our server instead of original Xtream server
 */
function rewriteM3UUrls(content: string, serverUrl: string): string {
  const lines = content.split('\n');
  const rewritten: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Se è una riga EXTINF, aggiungila così com'è
    if (line.startsWith('#EXTINF') || line.startsWith('#EXTM3U') || line.trim() === '') {
      rewritten.push(line);
      continue;
    }
    
    // Se è un URL, riscrivilo se punta al server originale
    if (line.trim().startsWith('http')) {
      try {
        const url = new URL(line.trim());
        const originalHost = url.hostname;
        
        // Se l'URL contiene il pattern Xtream (movie/, live/, series/), riscrivilo
        if (url.pathname.includes('/movie/') || url.pathname.includes('/live/') || url.pathname.includes('/series/')) {
          // Estrai il path dopo /movie/, /live/, o /series/
          const pathMatch = url.pathname.match(/\/(movie|live|series)\/(.+)$/);
          if (pathMatch) {
            const type = pathMatch[1];
            const path = pathMatch[2];
            // Costruisci nuovo URL che punta al nostro server
            const newUrl = `${serverUrl}/${type}/${path}`;
            rewritten.push(newUrl);
            continue;
          }
        }
      } catch (e) {
        // Se non è un URL valido, lascialo così com'è
      }
    }
    
    // Altrimenti aggiungi la riga così com'è
    rewritten.push(line);
  }
  
  return rewritten.join('\n');
}

/**
 * Generate M3U playlist content
 */
export async function generateM3U(type: 'm3u' | 'm3u_plus'): Promise<string> {
  // Ottieni l'URL base del nostro server
  const serverUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : (process.env.SERVER_URL || 'https://xstream-server.vercel.app');
  
  let content = '#EXTM3U\n';

  if (type === 'm3u') {
    // Only live streams
    try {
      const liveContent = await getPlaylistContent('live');
      const cleaned = cleanM3UContent(liveContent);
      const rewritten = rewriteM3UUrls(cleaned, serverUrl);
      content += rewritten;
      if (!rewritten.endsWith('\n')) {
        content += '\n';
      }
    } catch (error) {
      console.error('Error getting live content:', error);
      // Fallback to file if exists
      if (fs.existsSync(config.playlists.live)) {
        const fileContent = fs.readFileSync(config.playlists.live, 'utf-8');
        const cleaned = cleanM3UContent(fileContent);
        const rewritten = rewriteM3UUrls(cleaned, serverUrl);
        content += rewritten;
        if (!rewritten.endsWith('\n')) {
          content += '\n';
        }
      }
    }
  } else if (type === 'm3u_plus') {
    // Live + VOD + Series
    try {
      const liveContent = await getPlaylistContent('live');
      const cleaned = cleanM3UContent(liveContent);
      const rewritten = rewriteM3UUrls(cleaned, serverUrl);
      content += rewritten;
      if (!rewritten.endsWith('\n')) {
        content += '\n';
      }
    } catch (error) {
      console.error('Error getting live content:', error);
      if (fs.existsSync(config.playlists.live)) {
        const fileContent = fs.readFileSync(config.playlists.live, 'utf-8');
        const cleaned = cleanM3UContent(fileContent);
        const rewritten = rewriteM3UUrls(cleaned, serverUrl);
        content += rewritten;
        if (!rewritten.endsWith('\n')) {
          content += '\n';
        }
      }
    }

    try {
      const vodContent = await getPlaylistContent('vod');
      const cleaned = cleanM3UContent(vodContent);
      const rewritten = rewriteM3UUrls(cleaned, serverUrl);
      content += rewritten;
      if (!rewritten.endsWith('\n')) {
        content += '\n';
      }
    } catch (error) {
      console.error('Error getting vod content:', error);
      if (fs.existsSync(config.playlists.vod)) {
        const fileContent = fs.readFileSync(config.playlists.vod, 'utf-8');
        const cleaned = cleanM3UContent(fileContent);
        const rewritten = rewriteM3UUrls(cleaned, serverUrl);
        content += rewritten;
        if (!rewritten.endsWith('\n')) {
          content += '\n';
        }
      }
    }

    try {
      const seriesContent = await getPlaylistContent('series');
      const cleaned = cleanM3UContent(seriesContent);
      const rewritten = rewriteM3UUrls(cleaned, serverUrl);
      content += rewritten;
      if (!rewritten.endsWith('\n')) {
        content += '\n';
      }
    } catch (error) {
      console.error('Error getting series content:', error);
      if (fs.existsSync(config.playlists.series)) {
        const fileContent = fs.readFileSync(config.playlists.series, 'utf-8');
        const cleaned = cleanM3UContent(fileContent);
        const rewritten = rewriteM3UUrls(cleaned, serverUrl);
        content += rewritten;
        if (!rewritten.endsWith('\n')) {
          content += '\n';
        }
      }
    }
  }

  return content.trim() + '\n';
}

