/**
 * Vercel Serverless Function - Status Page
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import { config } from '../src/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check playlist files
  const liveExists = fs.existsSync(config.playlists.live);
  const vodExists = fs.existsSync(config.playlists.vod);
  const seriesExists = fs.existsSync(config.playlists.series);

  // Count streams
  let liveCount = 0;
  let vodCount = 0;
  let seriesCount = 0;

  if (liveExists) {
    const liveContent = fs.readFileSync(config.playlists.live, 'utf-8');
    liveCount = (liveContent.match(/#EXTINF/g) || []).length;
  }

  if (vodExists) {
    const vodContent = fs.readFileSync(config.playlists.vod, 'utf-8');
    vodCount = (vodContent.match(/#EXTINF/g) || []).length;
  }

  if (seriesExists) {
    const seriesContent = fs.readFileSync(config.playlists.series, 'utf-8');
    seriesCount = (seriesContent.match(/#EXTINF/g) || []).length;
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : req.headers.host
    ? `https://${req.headers.host}`
    : 'http://localhost:3000';

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xtream Server - Status</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 900px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 15px;
            margin-bottom: 30px;
        }
        .status {
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
            background: #e7f3ff;
            border-left: 4px solid #007bff;
        }
        .error {
            background: #ffe7e7;
            border-left-color: #dc3545;
        }
        .success {
            background: #e7f5e7;
            border-left-color: #28a745;
        }
        .info {
            background: #fff3cd;
            border-left-color: #ffc107;
        }
        code {
            background: #f4f4f4;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .endpoint {
            margin: 25px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .endpoint h3 {
            margin-top: 0;
            color: #007bff;
        }
        .endpoint p {
            margin: 10px 0;
            word-break: break-all;
        }
        ul {
            margin: 10px 0;
            padding-left: 25px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Xtream Server Status</h1>
        
        <div class="status ${liveExists ? 'success' : 'error'}">
            <strong>📺 Live Streams:</strong> 
            ${liveExists ? `✓ Disponibile (${liveCount.toLocaleString()} canali)` : '✗ File non trovato'}
        </div>
        
        <div class="status ${vodExists ? 'success' : 'error'}">
            <strong>🎬 VOD/Film:</strong> 
            ${vodExists ? `✓ Disponibile (${vodCount.toLocaleString()} film)` : '✗ File non trovato'}
        </div>
        
        <div class="status ${seriesExists ? 'success' : 'error'}">
            <strong>📺 Serie TV:</strong> 
            ${seriesExists ? `✓ Disponibile (${seriesCount.toLocaleString()} episodi)` : '✗ File non trovato'}
        </div>
        
        <div class="status info">
            <strong>ℹ️ Server URL:</strong> <code>${baseUrl}</code>
        </div>
        
        <h2>🔗 Endpoint Disponibili</h2>
        
        <div class="endpoint">
            <h3>Player API</h3>
            <p><code>${baseUrl}/player_api.php?username=user&password=pass&action=get_live_streams</code></p>
            <p><small>Azioni: get_live_streams, get_vod_streams, get_series, get_live_categories, get_vod_categories, get_series_categories, get_user_info</small></p>
        </div>
        
        <div class="endpoint">
            <h3>Playlist M3U</h3>
            <p><code>${baseUrl}/get.php?username=user&password=pass&type=m3u</code></p>
            <p><small>Tipi: m3u (solo live), m3u_plus (live + vod + serie)</small></p>
        </div>
        
        <h2>⚙️ Configurazione</h2>
        <div class="status info">
            <strong>Autenticazione:</strong> ${config.auth.enabled ? 'Abilitata' : 'Disabilitata'}<br>
            <strong>Cache:</strong> ${config.cache.enabled ? `Abilitata (${config.cache.ttl}s)` : 'Disabilitata'}<br>
            <strong>Logging:</strong> ${config.logging.enabled ? 'Abilitato' : 'Disabilitato'}
        </div>
        
        <h2>📝 Note</h2>
        <div class="status info">
            <p>Per utilizzare con un player Xtream:</p>
            <ul>
                <li><strong>URL Server:</strong> <code>${baseUrl}</code></li>
                <li><strong>Username:</strong> user (o qualsiasi utente configurato)</li>
                <li><strong>Password:</strong> pass (o password corrispondente)</li>
            </ul>
            <p>Oppure usa direttamente la playlist M3U nel player.</p>
        </div>
    </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}

