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
 * Restituisce le playlist originali senza modificarle per garantire che siano identiche alla sorgente
 */
export async function generateM3U(type: 'm3u' | 'm3u_plus'): Promise<string> {
  let content = '';

  if (type === 'm3u') {
    // Only live streams
    try {
      const liveContent = await getPlaylistContent('live');
      // Restituisci il contenuto originale senza modifiche
      if (liveContent && liveContent.trim()) {
        content = liveContent.trim();
        if (!content.startsWith('#EXTM3U')) {
          content = '#EXTM3U\n' + content;
        }
        if (!content.endsWith('\n')) {
          content += '\n';
        }
      }
    } catch (error) {
      console.error('Error getting live content:', error);
      // Fallback to file if exists
      if (fs.existsSync(config.playlists.live)) {
        content = fs.readFileSync(config.playlists.live, 'utf-8');
        if (!content.startsWith('#EXTM3U')) {
          content = '#EXTM3U\n' + content;
        }
        if (!content.endsWith('\n')) {
          content += '\n';
        }
      } else {
        content = '#EXTM3U\n';
      }
    }
  } else if (type === 'm3u_plus') {
    // Live + VOD + Series - combina tutto mantenendo il formato originale
    const parts: string[] = [];
    
    try {
      const liveContent = await getPlaylistContent('live');
      if (liveContent && liveContent.trim()) {
        let cleaned = liveContent.trim();
        // Rimuovi #EXTM3U se presente (lo aggiungeremo una volta all'inizio)
        if (cleaned.startsWith('#EXTM3U')) {
          cleaned = cleaned.substring(cleaned.indexOf('\n') + 1).trim();
        }
        if (cleaned) {
          parts.push(cleaned);
        }
      }
    } catch (error) {
      console.error('Error getting live content:', error);
      if (fs.existsSync(config.playlists.live)) {
        let fileContent = fs.readFileSync(config.playlists.live, 'utf-8').trim();
        if (fileContent.startsWith('#EXTM3U')) {
          fileContent = fileContent.substring(fileContent.indexOf('\n') + 1).trim();
        }
        if (fileContent) {
          parts.push(fileContent);
        }
      }
    }

    try {
      const vodContent = await getPlaylistContent('vod');
      if (vodContent && vodContent.trim()) {
        let cleaned = vodContent.trim();
        // Rimuovi #EXTM3U se presente
        if (cleaned.startsWith('#EXTM3U')) {
          cleaned = cleaned.substring(cleaned.indexOf('\n') + 1).trim();
        }
        if (cleaned) {
          parts.push(cleaned);
        }
      }
    } catch (error) {
      console.error('Error getting vod content:', error);
      if (fs.existsSync(config.playlists.vod)) {
        let fileContent = fs.readFileSync(config.playlists.vod, 'utf-8').trim();
        if (fileContent.startsWith('#EXTM3U')) {
          fileContent = fileContent.substring(fileContent.indexOf('\n') + 1).trim();
        }
        if (fileContent) {
          parts.push(fileContent);
        }
      }
    }

    try {
      const seriesContent = await getPlaylistContent('series');
      if (seriesContent && seriesContent.trim()) {
        let cleaned = seriesContent.trim();
        // Rimuovi #EXTM3U se presente
        if (cleaned.startsWith('#EXTM3U')) {
          cleaned = cleaned.substring(cleaned.indexOf('\n') + 1).trim();
        }
        if (cleaned) {
          parts.push(cleaned);
        }
      }
    } catch (error) {
      console.error('Error getting series content:', error);
      if (fs.existsSync(config.playlists.series)) {
        let fileContent = fs.readFileSync(config.playlists.series, 'utf-8').trim();
        if (fileContent.startsWith('#EXTM3U')) {
          fileContent = fileContent.substring(fileContent.indexOf('\n') + 1).trim();
        }
        if (fileContent) {
          parts.push(fileContent);
        }
      }
    }

    // Combina tutte le parti con un solo header #EXTM3U
    if (parts.length > 0) {
      content = '#EXTM3U\n' + parts.join('\n');
      if (!content.endsWith('\n')) {
        content += '\n';
      }
    } else {
      content = '#EXTM3U\n';
    }
  }

  return content;
}

