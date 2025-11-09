/**
 * Vercel Serverless Function - Auth Debug
 * Endpoint per verificare la configurazione dell'autenticazione
 * NON ESPONE LE PASSWORD, solo i nomi utente disponibili
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { config, logAccess } from '../src/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  logAccess('Auth debug endpoint accessed');

  try {
    const availableUsers = Object.keys(config.auth.users);
    const authEnabled = config.auth.enabled;
    
    // Verifica se ci sono variabili d'ambiente configurate
    const hasEnvAuth = !!(process.env.AUTH_USERNAME || process.env.AUTH_PASSWORD || process.env.AUTH_USERS);
    
    return res.status(200).json({
      auth_enabled: authEnabled,
      available_users: availableUsers,
      user_count: availableUsers.length,
      has_env_config: hasEnvAuth,
      environment: process.env.VERCEL ? 'vercel' : 'local',
      message: 'Use one of the available usernames with the corresponding password',
      note: 'Passwords are not exposed for security reasons. Check your environment variables or config file.'
    });
  } catch (error) {
    console.error('Error in auth debug:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

