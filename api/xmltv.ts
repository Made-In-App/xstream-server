/**
 * Vercel Serverless Function - XMLTV EPG
 * Endpoint per servire la guida programmi EPG in formato XMLTV
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAuth, logAccess } from '../src/config';
import { getPlaylistContent } from '../src/playlist-downloader';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get parameters
  const username = (req.query.username as string) || '';
  const password = (req.query.password as string) || '';

  // Authentication
  const authResult = checkAuth(username, password);
  if (!authResult.valid) {
    logAccess(`Failed EPG access: ${authResult.error || 'Invalid credentials'}`);
    return res.status(401).send(`<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n</tv>`);
  }

  logAccess(`EPG download: ${username}`);

  try {
    const epgContent = await getPlaylistContent('epg');

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="epg.xml"');
    return res.status(200).send(epgContent);
  } catch (error) {
    console.error('Error generating EPG:', error);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n</tv>');
  }
}

