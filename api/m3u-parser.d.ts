/**
 * M3U Playlist Parser
 */
import { Stream } from './types';
/**
 * Parse M3U playlist file
 * Se il file non esiste, prova a scaricarlo dal server Xtream
 */
export declare function parseM3UAsync(filePath: string): Promise<Stream[]>;
/**
 * Parse M3U playlist file (synchronous version for backward compatibility)
 */
export declare function parseM3U(filePath: string): Stream[];
/**
 * Extract stream ID from URL
 */
export declare function extractStreamId(url: string): string;
/**
 * Clear playlist cache
 */
export declare function clearCache(): void;
//# sourceMappingURL=m3u-parser.d.ts.map