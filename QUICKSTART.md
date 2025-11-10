# Quick Start

Guida rapida per partire in 5 minuti.

## 1. Setup Locale

```bash
# Installa pnpm
npm install -g pnpm

# Installa dipendenze
pnpm install

# Crea .env
cat > .env << EOF
XTREAM_BASE_URL=https://tuo-server.com
XTREAM_USERNAME=user
XTREAM_PASSWORD=pass
STORAGE_ROOT=./data
PUBLIC_BASE_URL=http://localhost:8080
STREAM_RELAY_BASE_URL=http://localhost:8090
EOF

# Scarica dati
pnpm ingest

# Avvia API
pnpm dev
```

## 2. Test

```bash
# Health check
curl http://localhost:8080/health

# Test API
curl "http://localhost:8080/player_api.php?username=user&password=pass"
```

## 3. Deploy su Render

1. Push su GitHub
2. Vai su [Render.com](https://render.com)
3. "New" → "Blueprint"
4. Connetti repository
5. Configura variabili d'ambiente (vedi [DEPLOY.md](./DEPLOY.md))
6. Deploy!

## Documentazione Completa

- [SETUP.md](./SETUP.md) - Setup dettagliato locale
- [DEPLOY.md](./DEPLOY.md) - Deploy su Render
- [CONFIGURAZIONE.md](./CONFIGURAZIONE.md) - Configurazione variabili

