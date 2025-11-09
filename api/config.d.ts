/**
 * Configuration for Xtream Server
 */
export interface Config {
    xtream: {
        url: string;
        username: string;
        password: string;
    };
    auth: {
        enabled: boolean;
        users: Record<string, string>;
    };
    cache: {
        enabled: boolean;
        ttl: number;
        directory: string;
    };
    playlists: {
        live: string;
        vod: string;
        series: string;
    };
    logging: {
        enabled: boolean;
    };
}
export declare const config: Config;
/**
 * Check if user credentials are valid
 */
export declare function checkAuth(username: string, password: string): boolean;
/**
 * Log access (can be extended to write to file or external service)
 */
export declare function logAccess(message: string): void;
//# sourceMappingURL=config.d.ts.map