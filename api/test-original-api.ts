/**
 * Vercel Serverless Function - Test Original API
 * Fa chiamate al server Xtream originale e mostra le risposte esatte
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import * as http from 'http';
import * as https from 'https';
import { config } from '../src/config';

function makeRequest(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'VLC/3.0.0',
      },
    };

    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { url: xtreamUrl, username, password } = config.xtream;
  const testType = (req.query.type as string) || 'user_info';

  try {
    let url = '';
    switch (testType) {
      case 'user_info':
        url = `${xtreamUrl}/player_api.php?username=${username}&password=${password}&action=get_user_info`;
        break;
      case 'no_action':
        url = `${xtreamUrl}/player_api.php?username=${username}&password=${password}`;
        break;
      case 'categories':
        url = `${xtreamUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
        break;
      case 'streams':
        url = `${xtreamUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid test type. Use: user_info, no_action, categories, streams' });
    }

    const result = await makeRequest(url);
    
    let parsedData: any;
    try {
      parsedData = JSON.parse(result.data);
    } catch (e) {
      parsedData = result.data;
    }

    return res.status(200).json({
      test_type: testType,
      url: url.replace(password, '***'),
      status: result.status,
      response: parsedData,
      raw_response: result.data.substring(0, 1000) + (result.data.length > 1000 ? '...' : ''),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to test API',
      message: error.message,
    });
  }
}

