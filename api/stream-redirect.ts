/**
 * Vercel Serverless Function - Stream Redirect
 * Gestisce le richieste dirette a /live/, /movie/, /series/ e le reindirizza a stream.php
 * 
 * Formato URL originale Xtream:
 * /movie/USERNAME/PASSWORD/ID
 * /live/USERNAME/PASSWORD/ID
 * /series/USERNAME/PASSWORD/ID
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { logAccess } from '../src/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let streamType = (req.query.type as string) || '';
  const path = (req.query.path as string) || '';
  const fullPath = req.url || '';

  logAccess(`Stream redirect: Type=${streamType}, Path=${path}, FullPath=${fullPath}`);

  // Estrai username, password e ID dal path
  // IMPORTANTE: USER e PASS nel path sono le credenziali del PROXY, non quelle Xtream
  // Formato: /movie/PROXY_USER/PROXY_PASS/ID oppure /PROXY_USER/PROXY_PASS/ID (senza tipo)
  // Il proxy userà internamente le credenziali Xtream configurate
  
  const pathParts = path.split('/').filter(p => p);
  
  if (pathParts.length < 3) {
    return res.status(400).json({ error: 'Invalid path format' });
  }

  let proxyUsername = '';
  let proxyPassword = '';
  let streamId = '';

  // L'ultimo elemento è sempre l'ID dello stream
  streamId = pathParts[pathParts.length - 1] || '';
  
  // Se l'ID contiene un punto (es. "402677.ts"), prendi solo la parte numerica
  if (streamId.includes('.')) {
    streamId = streamId.split('.')[0];
  }

  // Estrai le credenziali del proxy dal path
  // Formato semplice: /USER/PASS/ID
  // Se c'è un dominio intermedio, ignoralo e usa sempre i primi 2 elementi come credenziali proxy
  proxyUsername = pathParts[0] || '';
  proxyPassword = pathParts[1] || '';

  if (!streamId || !proxyUsername || !proxyPassword) {
    logAccess(`Failed to parse path: ${path}, parts: ${JSON.stringify(pathParts)}, streamId: ${streamId}, username: ${proxyUsername ? 'provided' : 'missing'}`);
    return res.status(400).json({ error: 'Failed to parse stream path', path, parts: pathParts });
  }

  // Se il tipo non è specificato, prova a determinarlo dinamicamente
  // Cerca lo stream in tutte le playlist per determinare il tipo
  if (!streamType || streamType === '') {
    try {
      const { parseM3UAsync } = await import('../src/m3u-parser');
      const { config } = await import('../src/config');
      
      // Prova prima con live
      const liveStreams = await parseM3UAsync(config.playlists.live);
      const foundInLive = liveStreams.find((s, idx) => {
        const urlId = s.url.match(/(?:\/movie\/|\/series\/|\/live\/|\/)(?:[^\/]+\/){2}([^\/\.]+)/)?.[1];
        return urlId === streamId || String(idx + 1) === streamId;
      });
      
      if (foundInLive) {
        streamType = 'live';
      } else {
        // Prova con VOD
        const vodStreams = await parseM3UAsync(config.playlists.vod);
        const foundInVod = vodStreams.find((s, idx) => {
          const urlId = s.url.match(/(?:\/movie\/|\/series\/|\/live\/|\/)(?:[^\/]+\/){2}([^\/\.]+)/)?.[1];
          return urlId === streamId || String(idx + 1) === streamId;
        });
        
        if (foundInVod) {
          streamType = 'movie';
        } else {
          // Prova con series
          const seriesStreams = await parseM3UAsync(config.playlists.series);
          const foundInSeries = seriesStreams.find((s, idx) => {
            const urlId = s.url.match(/(?:\/movie\/|\/series\/|\/live\/|\/)(?:[^\/]+\/){2}([^\/\.]+)/)?.[1];
            return urlId === streamId || String(idx + 1) === streamId;
          });
          
          if (foundInSeries) {
            streamType = 'series';
          } else {
            // Default a live se non trovato
            streamType = 'live';
          }
        }
      }
      
      logAccess(`Auto-detected stream type: ${streamType} for ID: ${streamId}`);
    } catch (error) {
      // Se c'è un errore, usa 'live' come default
      streamType = 'live';
      logAccess(`Error detecting stream type, using 'live' as default: ${error}`);
    }
  }

  // Verifica le credenziali del proxy (non quelle Xtream!)
  const { checkAuth } = await import('../src/config');
  const authResult = checkAuth(proxyUsername, proxyPassword);
  if (!authResult.valid) {
    logAccess(`Failed stream redirect auth: ${authResult.error || 'Invalid credentials'}`);
    return res.status(401).json({ error: authResult.error || 'Invalid credentials' });
  }

  // Reindirizza a stream.php con le credenziali del proxy
  // stream.php userà internamente le credenziali Xtream configurate
  const redirectUrl = `/stream.php?username=${encodeURIComponent(proxyUsername)}&password=${encodeURIComponent(proxyPassword)}&type=${streamType}&id=${encodeURIComponent(streamId)}`;
  
  logAccess(`Redirecting to stream.php (Xtream credentials hidden, type: ${streamType})`);
  return res.redirect(302, redirectUrl);
}

