export interface XtreamCredentials {
  username: string;
  password: string;
  baseUrl: string;
}

export type StreamType = 'live' | 'movie' | 'series';

export interface StreamMetadata {
  id: string;
  name: string;
  group?: string;
  logo?: string;
  streamType: StreamType;
  sourceUrl: string;
  epgChannelId?: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  type: StreamType;
}

export interface EpgEntry {
  channelId: string;
  title: string;
  description?: string;
  start: string;
  end: string;
}

export interface CachedSnapshot {
  generatedAt: string;
  live: StreamMetadata[];
  vod: StreamMetadata[];
  series: StreamMetadata[];
  categories: CategoryInfo[];
  epg?: EpgEntry[];
  raw?: {
    live?: unknown;
    vod?: unknown;
    series?: unknown;
  };
}

export interface UserInfo {
  username: string;
  password: string;
  status: 'Active' | 'Disabled';
  maxConnections: number;
  isTrial: boolean;
}

export interface ServerInfo {
  url: string;
  httpsPort: string;
  timezone: string;
  timestamp: number;
}

export interface SnapshotBundle {
  snapshot: CachedSnapshot;
  user: UserInfo;
  server: ServerInfo;
}

export const DATA_VERSION = 1;
