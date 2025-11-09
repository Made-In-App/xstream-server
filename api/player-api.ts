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
  getServerInfo,
  getShortEPG,
  getEPG,
  getSeriesInfo,
  getSeriesStreams,
  getVODInfo,
} from '../src/xtream-api';
import { UserInfo } from '../src/types';

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
  const action = (req.query.action as string) || (req.body?.action as string) || '';

  // Authentication
  const authResult = checkAuth(username, password);
  if (!authResult.valid) {
    logAccess(`Failed authentication: ${authResult.error || 'Invalid credentials'}`);
    // I client Xtream si aspettano un formato specifico per gli errori di autenticazione
    // Restituisci user_info con auth: 0 e status: Disabled
    const errorUserInfo: UserInfo = {
      username: '',
      password: '',
      message: authResult.error || 'Invalid username or password',
      auth: 0,
      status: 'Disabled',
      exp_date: '0',
      is_trial: '0',
      active_cons: '0',
      created_at: '',
      max_connections: '0',
      allowed_output_formats: []
    };
    // Alcuni client si aspettano direttamente l'oggetto user_info, altri wrappato
    // Prova entrambi i formati
    return res.status(200).json(errorUserInfo);
  }

  logAccess(`API access: ${username} - Action: ${action || '(none)'}`);

  // Se non c'è action, tratta come get_user_info (comportamento standard Xtream)
  // Molti client chiamano player_api.php senza action e si aspettano user_info + server_info
  if (!action || action.trim() === '') {
    logAccess(`No action specified, treating as get_user_info for ${username}`);
    const userInfo = getUserInfo(username);
    const serverInfo = getServerInfo();
    
    // Alcuni client si aspettano auth come stringa invece di numero
    // Convertiamo auth in stringa per compatibilità
    const response = {
      user_info: {
        ...userInfo,
        auth: String(userInfo.auth), // Converti auth in stringa per compatibilità
      },
      server_info: serverInfo,
    };
    // Log della risposta per debug
    console.log(`[DEBUG] Response for ${username} (no action, treated as get_user_info):`, JSON.stringify(response, null, 2));
    return res.status(200).json(response);
  }

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
        // Restituisci user_info + server_info come il server originale
        const userInfoForAction = getUserInfo(username);
        response = {
          user_info: {
            ...userInfoForAction,
            auth: String(userInfoForAction.auth), // Converti auth in stringa per compatibilità
          },
          server_info: getServerInfo(),
        };
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
        const vodId = (req.query.vod_id as string) || (req.query.id as string) || '';
        if (!vodId) {
          return res.status(400).json({ error: 'vod_id or id parameter required' });
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

