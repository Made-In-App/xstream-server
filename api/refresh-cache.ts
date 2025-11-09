/**
 * Vercel Serverless Function - Refresh Cache
 * Endpoint per forzare il refresh delle playlist cache
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAuth, logAccess } from '../src/config';
import { refreshPlaylistCache, getCacheInfo } from '../src/playlist-downloader';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get parameters
  const username = (req.query.username as string) || '';
  const password = (req.query.password as string) || '';
  const type = (req.query.type as string) || 'all'; // all, live, vod, series

  // Authentication
  const authResult = checkAuth(username, password);
  if (!authResult.valid) {
    logAccess(`Failed cache refresh: ${authResult.error || 'Invalid credentials'}`);
    return res.status(401).json({ error: authResult.error || 'Invalid credentials' });
  }

  logAccess(`Cache refresh: ${username} - Type: ${type}`);

  try {
    const results: Record<string, any> = {};

    if (type === 'all' || type === 'live') {
      await refreshPlaylistCache('live');
      results.live = getCacheInfo('live');
    }

    if (type === 'all' || type === 'vod') {
      await refreshPlaylistCache('vod');
      results.vod = getCacheInfo('vod');
    }

    if (type === 'all' || type === 'series') {
      await refreshPlaylistCache('series');
      results.series = getCacheInfo('series');
    }

    return res.status(200).json({
      success: true,
      message: 'Cache refreshed successfully',
      cache: results,
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

