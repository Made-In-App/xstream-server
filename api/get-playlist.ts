/**
 * Vercel Serverless Function - M3U Playlist Generator
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAuth, logAccess } from '../src/config';
import { generateM3U } from '../src/m3u-generator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get parameters
  const username = (req.query.username as string) || '';
  const password = (req.query.password as string) || '';
  const type = ((req.query.type as string) || 'm3u') as 'm3u' | 'm3u_plus';

  // Authentication
  if (!username || !password) {
    logAccess('Failed M3U access: missing credentials');
    return res.status(401).send('#EXTM3U - Authentication required');
  }

  if (!checkAuth(username, password)) {
    logAccess(`Failed M3U access attempt: ${username}`);
    return res.status(401).send('#EXTM3U - Invalid credentials');
  }

  logAccess(`M3U download: ${username} - Type: ${type}`);

  try {
    const playlist = await generateM3U(type);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="playlist.m3u"`);
    return res.status(200).send(playlist);
  } catch (error) {
    console.error('Error generating playlist:', error);
    return res.status(500).send('#EXTM3U - Error generating playlist');
  }
}

