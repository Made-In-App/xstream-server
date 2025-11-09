/**
 * Vercel Serverless Function - Purge Cache
 * Endpoint per svuotare manualmente la cache delle playlist
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { logAccess } from '../src/config';
import { purgeCache } from '../src/playlist-downloader';

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
  const type = (req.query.type as string) || 'all'; // all, live, vod, series

  // No authentication required for purge endpoint
  logAccess(`Cache purge requested - Type: ${type}`);

  try {
    const results: Record<string, any> = {};

    if (type === 'all' || type === 'live') {
      const purged = await purgeCache('live');
      results.live = { purged, message: purged ? 'Cache purged successfully' : 'No cache to purge' };
    }

    if (type === 'all' || type === 'vod') {
      const purged = await purgeCache('vod');
      results.vod = { purged, message: purged ? 'Cache purged successfully' : 'No cache to purge' };
    }

    if (type === 'all' || type === 'series') {
      const purged = await purgeCache('series');
      results.series = { purged, message: purged ? 'Cache purged successfully' : 'No cache to purge' };
    }

    return res.status(200).json({
      success: true,
      message: 'Cache purged successfully',
      results,
    });
  } catch (error) {
    console.error('Error purging cache:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

