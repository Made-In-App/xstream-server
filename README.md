# Xstream Platform

Piattaforma per replicare e servire un account Xtream Codes da più dispositivi contemporaneamente.

## Come Funziona

1. **Ingest**: Scarica periodicamente playlist e metadati dal server Xtream originale
2. **API**: Serve i dati cached con endpoint compatibili Xtream
3. **Relay**: Fa proxy degli stream, mantenendo una sola connessione upstream per canale

Risultato: più dispositivi possono usare lo stesso account Xtream senza problemi di connessioni multiple.

## Architettura

- **packages/ingest**: Job che scarica dati dal server Xtream
- **packages/core**: Tipi condivisi
- **apps/api**: Server Fastify con API compatibili Xtream
- **apps/stream-relay**: Proxy Go per streaming multi-client

## Quick Start

Vedi [SETUP.md](./SETUP.md) per setup locale.

Vedi [DEPLOY.md](./DEPLOY.md) per deploy su Render.com.

## Requisiti

- Node.js 18.18+
- pnpm
- Go 1.22+ (solo per test locale del relay)

## Deploy

Il progetto è configurato per **Render.com** (gratuito). Vercel non è più utilizzato perché:

- **Render.com** supporta persistent disk (necessario per condividere dati tra API e Ingest)
- **Render.com** supporta container Docker completi (necessario per il relay Go)
- **Render.com** ha un free tier che include storage persistente

Vedi [DEPLOY.md](./DEPLOY.md) per istruzioni complete.

## Licenza

MIT
