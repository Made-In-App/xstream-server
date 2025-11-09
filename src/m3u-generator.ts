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
 * Rewrite M3U URLs to point to our proxy server instead of original Xtream server
 * Sostituisce le credenziali Xtream con quelle del proxy per nasconderle
 */
function rewriteM3UUrls(content: string, proxyUrl: string, proxyUsername: string, proxyPassword: string): string {
  const lines = content.split('\n');
  const rewritten: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Se è una riga EXTINF, aggiungila così com'è
    if (line.startsWith('#EXTINF') || line.startsWith('#EXTM3U') || line.trim() === '') {
      rewritten.push(line);
      continue;
    }
    
    // Se è un URL, riscrivilo se punta al server originale Xtream
    if (line.trim().startsWith('http')) {
      try {
        const url = new URL(line.trim());
        
        // Se l'URL contiene il pattern Xtream (movie/, live/, series/), riscrivilo
        if (url.pathname.includes('/movie/') || url.pathname.includes('/live/') || url.pathname.includes('/series/')) {
          // Estrai il tipo e l'ID dall'URL originale
          // Formato: /movie/USER/PASS/ID o /live/USER/PASS/ID o /series/USER/PASS/ID
          const pathMatch = url.pathname.match(/\/(movie|live|series)\/([^\/]+)\/([^\/]+)\/(.+)$/);
          if (pathMatch) {
            const [, type, , , id] = pathMatch;
            // Rimuovi estensioni dal file se presenti (es. .ts, .mkv)
            const cleanId = id.split('.')[0];
            // Costruisci nuovo URL che punta al nostro proxy usando stream.php
            // Formato: /stream.php?username=PROXY_USER&password=PROXY_PASS&type=TYPE&id=ID
            const newUrl = `${proxyUrl}/stream.php?username=${encodeURIComponent(proxyUsername)}&password=${encodeURIComponent(proxyPassword)}&type=${type === 'movie' ? 'movie' : type === 'series' ? 'series' : 'live'}&id=${encodeURIComponent(cleanId)}`;
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
 * Get proxy URL from config or request
 */
function getProxyUrl(): string {
  // Se configurato, usa quello
  if (config.proxy.url) {
    return config.proxy.url;
  }
  
  // Altrimenti usa un placeholder che verrà sostituito dalla richiesta
  // In produzione su Vercel, questo verrà dedotto dall'header Host
  return '';
}

/**
 * Generate M3U playlist content
 * Riscrive gli URL per puntare al proxy invece del server Xtream originale
 */
export async function generateM3U(
  type: 'm3u' | 'm3u_plus', 
  requestUrl?: string,
  proxyUsername?: string,
  proxyPassword?: string
): Promise<string> {
  let content = '';

  // Determina l'URL del proxy
  let proxyBaseUrl = getProxyUrl();
  if (!proxyBaseUrl && requestUrl) {
    try {
      const url = new URL(requestUrl);
      proxyBaseUrl = `${url.protocol}//${url.host}`;
    } catch (e) {
      // Se non è un URL valido, usa quello dalla config
      proxyBaseUrl = getProxyUrl();
    }
  }
  
  // Se ancora non abbiamo un URL, usa un placeholder
  if (!proxyBaseUrl) {
    proxyBaseUrl = 'https://your-proxy.vercel.app';
  }
  
  // Ottieni le credenziali del proxy (usa quelle passate o il primo utente configurato come default)
  let finalProxyUsername: string;
  let finalProxyPassword: string;
  
  if (proxyUsername && proxyPassword) {
    finalProxyUsername = proxyUsername;
    finalProxyPassword = proxyPassword;
  } else {
    const proxyUsers = Object.keys(config.auth.users);
    finalProxyUsername = proxyUsers.length > 0 ? proxyUsers[0] : 'user';
    finalProxyPassword = config.auth.users[finalProxyUsername] || 'pass';
  }

  if (type === 'm3u') {
    // Only live streams
    try {
      const liveContent = await getPlaylistContent('live');
      // Riscrivi gli URL per puntare al proxy
      if (liveContent && liveContent.trim()) {
        content = liveContent.trim();
        if (!content.startsWith('#EXTM3U')) {
          content = '#EXTM3U\n' + content;
        }
        // Riscrivi gli URL per nascondere le credenziali Xtream
        content = rewriteM3UUrls(content, proxyBaseUrl, finalProxyUsername, finalProxyPassword);
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
        // Riscrivi gli URL anche per il fallback
        content = rewriteM3UUrls(content, proxyBaseUrl, finalProxyUsername, finalProxyPassword);
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
          // Riscrivi gli URL per nascondere le credenziali Xtream
          cleaned = rewriteM3UUrls(cleaned, proxyBaseUrl, finalProxyUsername, finalProxyPassword);
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
          // Riscrivi gli URL anche per il fallback
          fileContent = rewriteM3UUrls(fileContent, proxyBaseUrl, finalProxyUsername, finalProxyPassword);
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
          // Riscrivi gli URL per nascondere le credenziali Xtream
          cleaned = rewriteM3UUrls(cleaned, proxyBaseUrl, finalProxyUsername, finalProxyPassword);
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
          // Riscrivi gli URL anche per il fallback
          fileContent = rewriteM3UUrls(fileContent, proxyBaseUrl, finalProxyUsername, finalProxyPassword);
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
          // Riscrivi gli URL per nascondere le credenziali Xtream
          cleaned = rewriteM3UUrls(cleaned, proxyBaseUrl, finalProxyUsername, finalProxyPassword);
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
          // Riscrivi gli URL anche per il fallback
          fileContent = rewriteM3UUrls(fileContent, proxyBaseUrl, finalProxyUsername, finalProxyPassword);
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

