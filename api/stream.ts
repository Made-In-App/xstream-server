/**
 * Vercel Serverless Function - Stream Proxy
 * Endpoint per fare proxy dello streaming dal server Xtream originale
 * 
 * Formato URL Xtream standard:
 * /stream.php?username=USER&password=PASS&type=live&id=STREAM_ID
 * /stream.php?username=USER&password=PASS&type=movie&id=VOD_ID
 * /stream.php?username=USER&password=PASS&type=series&id=SERIES_ID
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAuth, logAccess, config } from '../src/config';
import * as http from 'http';
import * as https from 'https';
import { parseM3UAsync } from '../src/m3u-parser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get parameters from query string OR body (support both GET and POST)
  const username = (req.query.username as string) || (req.body?.username as string) || '';
  const password = (req.query.password as string) || (req.body?.password as string) || '';
  const streamType = (req.query.type as string) || (req.body?.type as string) || ''; // live, movie, series
  const streamId = (req.query.id as string) || (req.body?.id as string) || '';

  // Authentication
  const authResult = checkAuth(username, password);
  if (!authResult.valid) {
    logAccess(`Failed stream access: ${authResult.error || 'Invalid credentials'}`);
    return res.status(401).json({ error: authResult.error || 'Invalid credentials' });
  }

  if (!streamType || !streamId) {
    return res.status(400).json({ error: 'type and id parameters are required' });
  }

  logAccess(`Stream request: ${username} - Type: ${streamType}, ID: ${streamId}`);

  try {
    // Determina il tipo di playlist
    let playlistType: 'live' | 'vod' | 'series' = 'live';
    if (streamType === 'movie') {
      playlistType = 'vod';
    } else if (streamType === 'series') {
      playlistType = 'series';
    }

    // Carica la playlist corrispondente
    const playlistPath = config.playlists[playlistType];
    const streams = await parseM3UAsync(playlistPath);

    // Trova lo stream corrispondente
    let targetStream = streams.find((s, idx) => {
      // Estrai l'ID dall'URL o usa l'indice
      const urlId = s.url.match(/(?:\/movie\/|\/series\/|\/)(?:[^\/]+\/){2}([^\/\.]+)/)?.[1];
      return urlId === streamId || String(idx + 1) === streamId;
    });

    if (!targetStream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Costruisci l'URL del server Xtream originale
    const { url: xtreamUrl, username: xtreamUser, password: xtreamPass } = config.xtream;
    
    // Se l'URL dello stream è già completo, usalo direttamente
    // Altrimenti costruisci l'URL usando il server originale
    let streamUrl = targetStream.url;
    
    // Se l'URL non è completo, costruiscilo usando il server originale
    if (!streamUrl.startsWith('http')) {
      if (streamType === 'live') {
        streamUrl = `${xtreamUrl}/live/${xtreamUser}/${xtreamPass}/${streamId}`;
      } else if (streamType === 'movie') {
        streamUrl = `${xtreamUrl}/movie/${xtreamUser}/${xtreamPass}/${streamId}.ts`;
      } else if (streamType === 'series') {
        streamUrl = `${xtreamUrl}/series/${xtreamUser}/${xtreamPass}/${streamId}.mkv`;
      }
    }

    // Reindirizza al server originale (302 redirect)
    // I client Xtream si aspettano un redirect o un proxy
    logAccess(`Redirecting stream to: ${streamUrl}`);
    return res.redirect(302, streamUrl);

  } catch (error) {
    console.error('Error processing stream request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

