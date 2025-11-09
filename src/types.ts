/**
 * Type definitions for Xtream API
 */

export interface Stream {
  extinf: string;
  name: string;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  groupTitle?: string;
  url: string;
}

export interface LiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: string;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  category_name: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface VODStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: string;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  category_name: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface Series {
  num: number;
  name: string;
  series_id: string;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
  category_name: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface UserInfo {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string | number; // Timestamp Unix (numero) o "0" come stringa
  is_trial: string;
  active_cons: string;
  created_at: string | number; // Timestamp Unix (numero) o stringa formato data
  max_connections: string;
  allowed_output_formats: string[];
}

export interface ServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
  process: boolean;
}

export interface SeriesInfo extends Series {
  seasons: Season[];
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  season_number: number;
  cover: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  episode_num: string;
  title: string;
  container_extension: string;
  info: {
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    duration_secs: string;
  };
  added: string;
  season: number;
  direct_source: string;
}

export interface VODInfo extends VODStream {
  info: {
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    duration_secs: string;
  };
}

