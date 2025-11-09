/**
 * Vercel Serverless Function - Player API
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAuth, logAccess } from '../src/config';
import {
  getLiveStreams,
  getVODStreams,
  getSeries,
  getLiveCategories,
  getVODCategories,
  getSeriesCategories,
  getUserInfo,
  getShortEPG,
  getEPG,
  getSeriesInfo,
  getSeriesStreams,
  getVODInfo,
} from '../src/xtream-api';

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
  const action = (req.query.action as string) || '';

  // Authentication
  const authResult = checkAuth(username, password);
  if (!authResult.valid) {
    logAccess(`Failed authentication: ${authResult.error || 'Invalid credentials'}`);
    return res.status(401).json({ error: authResult.error || 'Invalid credentials' });
  }

  logAccess(`API access: ${username} - Action: ${action}`);

  // Handle actions
  let response: any;

  try {
    switch (action) {
      case 'get_live_streams':
        response = await getLiveStreams();
        break;

      case 'get_vod_streams':
        response = await getVODStreams();
        break;

      case 'get_series':
        response = await getSeries();
        break;

      case 'get_live_categories':
        response = await getLiveCategories();
        break;

      case 'get_vod_categories':
        response = await getVODCategories();
        break;

      case 'get_series_categories':
        response = await getSeriesCategories();
        break;

      case 'get_user_info':
        response = getUserInfo(username);
        break;

      case 'get_short_epg':
        const streamId = (req.query.stream_id as string) || '';
        response = await getShortEPG(streamId);
        break;

      case 'get_epg':
        const epgStreamId = (req.query.stream_id as string) || '';
        if (!epgStreamId) {
          return res.status(400).json({ error: 'stream_id parameter required' });
        }
        response = await getEPG(epgStreamId);
        break;

      case 'get_series_info':
        const seriesId = (req.query.series_id as string) || '';
        if (!seriesId) {
          return res.status(400).json({ error: 'series_id parameter required' });
        }
        response = await getSeriesInfo(seriesId);
        if (!response) {
          return res.status(404).json({ error: 'Series not found' });
        }
        break;

      case 'get_series_streams':
        const seriesStreamId = (req.query.series_id as string) || '';
        if (!seriesStreamId) {
          return res.status(400).json({ error: 'series_id parameter required' });
        }
        response = await getSeriesStreams(seriesStreamId);
        break;

      case 'get_vod_info':
        const vodId = (req.query.vod_id as string) || '';
        if (!vodId) {
          return res.status(400).json({ error: 'vod_id parameter required' });
        }
        response = await getVODInfo(vodId);
        if (!response) {
          return res.status(404).json({ error: 'VOD not found' });
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

