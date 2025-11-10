# Configurazione

Guida semplice per configurare la piattaforma Xstream.

## Variabili d'Ambiente

### Locale (.env)

Crea un file `.env` nella root del progetto:

```env
# Credenziali Xtream (obbligatorie)
XTREAM_BASE_URL=https://tuo-server-xtream.com
XTREAM_USERNAME=tuo-username
XTREAM_PASSWORD=tua-password

# Storage
STORAGE_ROOT=./data

# URL Pubblici (per produzione)
PUBLIC_BASE_URL=http://localhost:8080
STREAM_RELAY_BASE_URL=http://localhost:8090
```

### Produzione (Render.com)

Configura le stesse variabili nella dashboard Render per ogni servizio.

## Servizi

### 1. API (apps/api)

**Porta**: 8080 (default)

**Variabili richieste**:
- `XTREAM_BASE_URL` (opzionale, usa quella dal bundle se non settata)
- `XTREAM_USERNAME` (opzionale)
- `XTREAM_PASSWORD` (opzionale)
- `DATA_ROOT` (default: `./data`)
- `PUBLIC_BASE_URL` (URL pubblico del servizio API)
- `STREAM_RELAY_BASE_URL` (URL pubblico del relay)

### 2. Relay (apps/stream-relay)

**Porta**: 8090 (default)

**Variabili richieste**:
- `XTREAM_BASE_URL` (obbligatorio)
- `XTREAM_USERNAME` (obbligatorio)
- `XTREAM_PASSWORD` (obbligatorio)
- `STREAM_RELAY_PORT` (default: 8090)

### 3. Ingest (packages/ingest)

**Variabili richieste**:
- `XTREAM_BASE_URL` (obbligatorio)
- `XTREAM_USERNAME` (obbligatorio)
- `XTREAM_PASSWORD` (obbligatorio)
- `STORAGE_ROOT` (default: `./data`)

## URL Client IPTV

Dopo il deploy, usa questo URL come server nei tuoi client IPTV:

```
https://xstream-api.onrender.com
```

Con le credenziali configurate in `XTREAM_USERNAME` e `XTREAM_PASSWORD`.

## Verifica Configurazione

### Test Locale

```bash
# Verifica ingest
pnpm ingest

# Verifica API
pnpm dev
# Poi: curl http://localhost:8080/health

# Verifica relay
cd apps/stream-relay && go run main.go
# Poi: curl http://localhost:8090/health
```

### Test Produzione

```bash
# API
curl https://xstream-api.onrender.com/health

# Relay
curl https://xstream-relay.onrender.com/health

# Test completo
curl "https://xstream-api.onrender.com/player_api.php?username=USER&password=PASS"
```

