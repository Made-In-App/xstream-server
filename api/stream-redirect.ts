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

  const streamType = (req.query.type as string) || '';
  const path = (req.query.path as string) || '';
  const fullPath = req.url || '';

  logAccess(`Stream redirect: Type=${streamType}, Path=${path}, FullPath=${fullPath}`);

  // Estrai username, password e ID dal path
  // Formato esempi:
  // /movie/USERNAME/PASSWORD/ID (semplice)
  // /movie/USERNAME/PASSWORD/0.domain:port/USERNAME2/PASSWORD2/ID (con dominio intermedio)
  // /movie/AmicoCaro/AmicoCaro2025/0.xn--t60b56a:80/Emmgen2/gJWB28F/402677
  
  const pathParts = path.split('/').filter(p => p);
  
  if (pathParts.length < 3) {
    return res.status(400).json({ error: 'Invalid path format' });
  }

  let username = '';
  let password = '';
  let streamId = '';

  // L'ultimo elemento è sempre l'ID dello stream
  streamId = pathParts[pathParts.length - 1] || '';
  
  // Se l'ID contiene un punto (es. "402677.ts"), prendi solo la parte numerica
  if (streamId.includes('.')) {
    streamId = streamId.split('.')[0];
  }

  // Cerca username e password: possono essere:
  // 1. Gli ultimi 2 elementi prima dell'ID (se path semplice)
  // 2. Gli ultimi 2 elementi prima dell'ID (se c'è un dominio intermedio, usa quelli finali)
  
  // Se c'è un dominio intermedio (contiene ":" o "."), usa gli ultimi 2 prima dell'ID
  // Altrimenti usa i primi 2 del path
  const hasDomain = pathParts.some(p => p.includes(':') || (p.includes('.') && !/^\d+$/.test(p)));
  
  if (hasDomain && pathParts.length >= 5) {
    // Formato con dominio: /USER1/PASS1/0.domain:port/USER2/PASS2/ID
    // Usa USER2 e PASS2 (quelli dopo il dominio)
    username = pathParts[pathParts.length - 3] || '';
    password = pathParts[pathParts.length - 2] || '';
  } else {
    // Formato semplice: /USER/PASS/ID
    username = pathParts[0] || '';
    password = pathParts[1] || '';
  }

  if (!streamId || !username || !password) {
    logAccess(`Failed to parse path: ${path}, parts: ${JSON.stringify(pathParts)}, streamId: ${streamId}, username: ${username}, password: ${password ? '***' : ''}`);
    return res.status(400).json({ error: 'Failed to parse stream path', path, parts: pathParts });
  }

  // Reindirizza a stream.php con i parametri corretti
  const redirectUrl = `/stream.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=${streamType}&id=${streamId}`;
  
  logAccess(`Redirecting to: ${redirectUrl}`);
  return res.redirect(302, redirectUrl);
}

