# Xstream Platform

Piattaforma per replicare e servire un account Xtream Codes da più dispositivi contemporaneamente.

## Come Funziona

1. **Ingest**: Scarica periodicamente playlist e metadati dal server Xtream originale
2. **API**: Serve i dati cached con endpoint compatibili Xtream (`player_api.php`, `get.php`, `xmltv.php`)
3. **Relay**: Fa proxy degli stream, mantenendo una sola connessione upstream per canale

Risultato: più dispositivi possono usare lo stesso account Xtream senza problemi di connessioni multiple.

## Architettura Unificata

Il servizio è unificato in un solo container che include:
- **packages/ingest**: Job che scarica dati dal server Xtream
- **packages/core**: Tipi condivisi
- **apps/api**: Server Fastify con API compatibili Xtream + proxy interno al relay
- **apps/stream-relay**: Proxy Go per streaming multi-client (gira su localhost:8090)

Tutto esposto su una sola porta (8080) e un solo servizio Fly.io.

## Quick Start

Vedi [SETUP.md](./SETUP.md) per setup locale.

## Requisiti

- Node.js 18.18+
- pnpm
- Go 1.22+ (solo per build del relay)

## Deploy

Vedi [DEPLOY.md](./DEPLOY.md) per istruzioni di deploy su Fly.io.

## Licenza

MIT
