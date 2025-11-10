import {
  CachedSnapshot,
  CategoryInfo,
  SnapshotBundle,
  StreamMetadata,
  StreamType,
  UserInfo,
  ServerInfo,
} from '@xstream/core';

interface XtreamStream {
  stream_id: number | string;
  name: string;
  stream_type?: string;
  stream_icon?: string;
  stream_url?: string;
  direct_source?: string;
  category_id?: string | number;
  category_name?: string;
  tvg_id?: string;
}

interface XtreamCategory {
  category_id: string;
  category_name: string;
}

interface UserInfoResponse {
  user_info: {
    username: string;
    password: string;
    status: string;
    max_connections: string | number;
    is_trial: string | number;
  };
  server_info: {
    url: string;
    https_port: string | number;
    timezone: string;
    timestamp_now: number;
  };
}

function normalizeStreamType(raw?: string): StreamType {
  if (!raw) return 'live';
  if (raw === 'movie' || raw === 'series') return raw;
  return raw === 'vod' ? 'movie' : 'live';
}

function buildStreamMetadata(streams: XtreamStream[], type: StreamType): StreamMetadata[] {
  return streams.map((item) => ({
    id: String(item.stream_id ?? item.name),
    name: item.name,
    group: item.category_name,
    logo: item.stream_icon,
    streamType: type,
    sourceUrl: item.direct_source ?? item.stream_url ?? '',
    epgChannelId: item.tvg_id,
  }));
}

function buildCategories(
  live: XtreamCategory[],
  vod: XtreamCategory[],
  series: XtreamCategory[],
): CategoryInfo[] {
  const convert = (list: XtreamCategory[], type: StreamType): CategoryInfo[] =>
    list.map((cat) => ({
      id: String(cat.category_id),
      name: cat.category_name,
      type,
    }));

  return [
    ...convert(live, 'live'),
    ...convert(vod, 'movie'),
    ...convert(series, 'series'),
  ];
}

function buildUserInfo(response: UserInfoResponse): { user: UserInfo; server: ServerInfo } {
  const { user_info: userInfo, server_info: serverInfo } = response;
  const user: UserInfo = {
    username: userInfo.username,
    password: userInfo.password,
    status: userInfo.status === 'Active' ? 'Active' : 'Disabled',
    maxConnections: Number(userInfo.max_connections ?? 1),
    isTrial: String(userInfo.is_trial ?? '0') === '1',
  };

  const server: ServerInfo = {
    url: serverInfo.url,
    httpsPort: String(serverInfo.https_port ?? ''),
    timezone: serverInfo.timezone,
    timestamp: serverInfo.timestamp_now,
  };

  return { user, server };
}

export function buildSnapshotBundle(params: {
  liveStreams: XtreamStream[];
  vodStreams: XtreamStream[];
  seriesStreams: XtreamStream[];
  liveCategories: XtreamCategory[];
  vodCategories: XtreamCategory[];
  seriesCategories: XtreamCategory[];
  userInfoResponse: UserInfoResponse;
}): SnapshotBundle {
  const live = buildStreamMetadata(params.liveStreams, 'live');
  const vod = buildStreamMetadata(params.vodStreams, 'movie');
  const series = buildStreamMetadata(params.seriesStreams, 'series');
  const categories = buildCategories(
    params.liveCategories,
    params.vodCategories,
    params.seriesCategories,
  );

  const snapshot: CachedSnapshot = {
    generatedAt: new Date().toISOString(),
    live,
    vod,
    series,
    categories,
    raw: {
      live: params.liveStreams,
      vod: params.vodStreams,
      series: params.seriesStreams,
    },
  };

  const { user, server } = buildUserInfo(params.userInfoResponse);

  return {
    snapshot,
    user,
    server,
  };
}
