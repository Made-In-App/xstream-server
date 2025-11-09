/**
 * Vercel Serverless Function - M3U Playlist Generator
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAuth, logAccess } from '../src/config';
import { generateM3U } from '../src/m3u-generator';

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
  const type = ((req.query.type as string) || (req.body?.type as string) || 'm3u') as 'm3u' | 'm3u_plus';

  // Authentication
  const authResult = checkAuth(username, password);
  if (!authResult.valid) {
    logAccess(`Failed M3U access: ${authResult.error || 'Invalid credentials'}`);
    return res.status(401).send(`#EXTM3U - ${authResult.error || 'Invalid credentials'}`);
  }

  logAccess(`M3U download: ${username} - Type: ${type}`);

  try {
    // Costruisci l'URL della richiesta per dedurre l'URL del proxy
    const protocol = req.headers['x-forwarded-proto'] || (req.headers['x-forwarded-ssl'] === 'on' ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const requestUrl = host ? `${protocol}://${host}` : undefined;
    
    // Passa le credenziali dell'utente che ha fatto la richiesta
    const playlist = await generateM3U(type, requestUrl, username, password);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="playlist.m3u"`);
    return res.status(200).send(playlist);
  } catch (error) {
    console.error('Error generating playlist:', error);
    return res.status(500).send('#EXTM3U - Error generating playlist');
  }
}

