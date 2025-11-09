"use strict";
/**
 * Configuration for Xtream Server
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.checkAuth = checkAuth;
exports.logAccess = logAccess;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Carica configurazione da file o usa default
function loadConfig() {
    const configPath = path.join(process.cwd(), 'xtream-config.json');
    let config;
    if (fs.existsSync(configPath)) {
        try {
            const configData = fs.readFileSync(configPath, 'utf-8');
            const fileConfig = JSON.parse(configData);
            config = {
                ...getDefaultConfig(),
                ...fileConfig,
            };
        }
        catch (error) {
            console.warn('Error loading config file, using defaults:', error);
            config = getDefaultConfig();
        }
    }
    else {
        config = getDefaultConfig();
        // Crea file di configurazione di esempio
        createExampleConfig(configPath);
    }
    return config;
}
function getDefaultConfig() {
    return {
        xtream: {
            url: process.env.XSTREAM_URL || 'https://fn2ilpirata.rearc.xn--t60b56a',
            username: process.env.XSTREAM_USERNAME || 'Emmgen2',
            password: process.env.XSTREAM_PASSWORD || 'gJWB28F',
        },
        auth: {
            enabled: true,
            users: {
                user: 'pass',
                admin: 'admin123',
            },
        },
        cache: {
            enabled: true,
            ttl: 3600, // 1 hour
            directory: process.env.CACHE_DIR || './cache',
        },
        playlists: {
            live: process.env.LIVE_M3U_PATH || './playlists/xtream_Emmgen2_LIVE.m3u',
            vod: process.env.VOD_M3U_PATH || './playlists/xtream_Emmgen2_VOD.m3u',
            series: process.env.SERIES_M3U_PATH || './playlists/xtream_Emmgen2_SERIES.m3u',
        },
        logging: {
            enabled: true,
        },
    };
}
function createExampleConfig(configPath) {
    const exampleConfig = {
        xtream: {
            url: 'https://fn2ilpirata.rearc.xn--t60b56a',
            username: 'Emmgen2',
            password: 'gJWB28F',
            comment: 'Credenziali per accedere al server Xtream originale (statiche)',
        },
        auth: {
            enabled: true,
            users: {
                user: 'pass',
                admin: 'admin123',
                comment: 'Credenziali per accedere al nostro server (configurabili)',
            },
        },
        cache: {
            enabled: true,
            ttl: 3600,
            directory: './cache',
        },
        playlists: {
            live: './playlists/xtream_Emmgen2_LIVE.m3u',
            vod: './playlists/xtream_Emmgen2_VOD.m3u',
            series: './playlists/xtream_Emmgen2_SERIES.m3u',
        },
        logging: {
            enabled: true,
        },
    };
    try {
        fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
        console.log(`Created example config file: ${configPath}`);
    }
    catch (error) {
        console.warn('Could not create example config file:', error);
    }
}
exports.config = loadConfig();
// Assicura che la directory cache esista
if (exports.config.cache.enabled && exports.config.cache.directory) {
    const cacheDir = path.resolve(exports.config.cache.directory);
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
}
/**
 * Check if user credentials are valid
 */
function checkAuth(username, password) {
    if (!exports.config.auth.enabled) {
        return true;
    }
    return exports.config.auth.users[username] === password;
}
/**
 * Log access (can be extended to write to file or external service)
 */
function logAccess(message) {
    if (exports.config.logging.enabled) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }
}
//# sourceMappingURL=config.js.map