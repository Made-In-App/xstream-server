/**
 * Vercel Serverless Function - Empty Page
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Pagina bianca vuota
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send('');
}

