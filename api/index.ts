/**
 * Vercel Serverless Function - Root Endpoint
 * Gestisce richieste alla root e logga richieste non gestite
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserInfo } from '../src/xtream-api';
import { checkAuth, logAccess } from '../src/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const method = req.method || 'GET';
  
  // Se ci sono parametri username/password, potrebbe essere una richiesta Xtream
  const username = (req.query.username as string) || '';
  const password = (req.query.password as string) || '';
  
  if (username && password) {
    // Sembra una richiesta Xtream, prova l'autenticazione e restituisci user_info
    logAccess(`Root endpoint called with credentials - redirecting to player_api.php`);
    const authResult = checkAuth(username, password);
    if (authResult.valid) {
      return res.status(200).json(getUserInfo(username));
    } else {
      return res.status(200).json({ 
        user_info: {
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
        }
      });
    }
  }
  
  // Log per debug
  console.log('Root endpoint called:', { method, url, query: req.query });
  
  // Pagina bianca vuota
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send('');
}

