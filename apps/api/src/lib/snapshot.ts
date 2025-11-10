import { promises as fs } from 'fs';
import path from 'path';
import { env } from './env.js';
import type { SnapshotBundle } from '@xstream/core';

let cache: {
  bundle: SnapshotBundle;
  mtimeMs: number;
} | null = null;

const bundlePath = path.resolve(env.DATA_ROOT, 'bundle.json');

async function readBundle(): Promise<SnapshotBundle> {
  const raw = await fs.readFile(bundlePath, 'utf-8');
  return JSON.parse(raw) as SnapshotBundle;
}

export async function loadSnapshotBundle(): Promise<SnapshotBundle> {
  try {
    const stats = await fs.stat(bundlePath);
    if (cache && cache.mtimeMs === stats.mtimeMs) {
      return cache.bundle;
    }

    const bundle = await readBundle();
    cache = { bundle, mtimeMs: stats.mtimeMs };
    return bundle;
  } catch (error) {
    throw new Error(`Snapshot not available at ${bundlePath}. Run ingest first. Original error: ${String(error)}`);
  }
}
