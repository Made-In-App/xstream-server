/**
 * Xtream API Handlers
 */
import { LiveStream, VODStream, Series, Category, UserInfo } from './types';
/**
 * Get Live Streams
 */
export declare function getLiveStreams(): Promise<LiveStream[]>;
/**
 * Get VOD Streams
 */
export declare function getVODStreams(): Promise<VODStream[]>;
/**
 * Get Series
 */
export declare function getSeries(): Promise<Series[]>;
/**
 * Get Live Categories
 */
export declare function getLiveCategories(): Promise<Category[]>;
/**
 * Get VOD Categories
 */
export declare function getVODCategories(): Promise<Category[]>;
/**
 * Get Series Categories
 */
export declare function getSeriesCategories(): Promise<Category[]>;
/**
 * Get User Info
 */
export declare function getUserInfo(username: string): UserInfo;
//# sourceMappingURL=xtream-api.d.ts.map