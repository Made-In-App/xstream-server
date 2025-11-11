import fetch, { RequestInit as NodeFetchRequestInit } from 'node-fetch';
import { env } from './env.js';
import { logger } from './logger.js';

type FetchParams = {
  action?: string;
  extra?: Record<string, string>;
};

async function request(path: string, init?: NodeFetchRequestInit) {
  const url = new URL(path, env.XTREAM_BASE_URL);
  url.searchParams.set('username', env.XTREAM_USERNAME);
  url.searchParams.set('password', env.XTREAM_PASSWORD);

  logger.debug({ url: url.toString() }, 'Fetching upstream');

  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status} ${response.statusText}`);
  }
  return response;
}

async function fetchPlayerApi<T>({ action, extra }: FetchParams = {}) {
  const url = new URL('/player_api.php', env.XTREAM_BASE_URL);
  url.searchParams.set('username', env.XTREAM_USERNAME);
  url.searchParams.set('password', env.XTREAM_PASSWORD);
  if (action) url.searchParams.set('action', action);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Player API failed: ${response.status}`);
  }
  const data = (await response.json()) as T;
  return data;
}

export async function fetchM3U(type: 'm3u' | 'm3u_plus') {
  const res = await request(`/get.php?type=${type}`);
  return res.text();
}

export async function fetchXmlTv() {
  const res = await request('/xmltv.php');
  return res.text();
}

export async function fetchLiveStreams() {
  return fetchPlayerApi<any>({ action: 'get_live_streams' });
}

export async function fetchVodStreams() {
  return fetchPlayerApi<any>({ action: 'get_vod_streams' });
}

export async function fetchSeries() {
  return fetchPlayerApi<any>({ action: 'get_series' });
}

export async function fetchLiveCategories() {
  return fetchPlayerApi<any>({ action: 'get_live_categories' });
}

export async function fetchVodCategories() {
  return fetchPlayerApi<any>({ action: 'get_vod_categories' });
}

export async function fetchSeriesCategories() {
  return fetchPlayerApi<any>({ action: 'get_series_categories' });
}

export async function fetchUserInfo() {
  const data = await fetchPlayerApi<any>();
  return data;
}
