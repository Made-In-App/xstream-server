# Setup Locale

Guida semplice per configurare e testare il progetto in locale.

## Installazione

```bash
# Installa pnpm
npm install -g pnpm

# Installa dipendenze
pnpm install
```

## Configurazione

Crea il file `.env` nella root del progetto:

```env
XTREAM_BASE_URL=https://tuo-server-xtream.com
XTREAM_USERNAME=tuo-username
XTREAM_PASSWORD=tua-password
STORAGE_ROOT=./data
PUBLIC_BASE_URL=http://localhost:8080
STREAM_RELAY_BASE_URL=http://localhost:8090
```

## Uso

### 1. Scarica i Dati (Ingest)

```bash
pnpm ingest
```

Questo scarica playlist, metadati ed EPG dal server Xtream e li salva in `./data/`.

### 2. Avvia l'API

```bash
pnpm dev
```

L'API sarà disponibile su `http://localhost:8080`

### 3. Avvia il Relay (opzionale per test)

```bash
cd apps/stream-relay
go mod tidy
go run main.go
```

Il relay sarà disponibile su `http://localhost:8090`

## Test

### Test API

```bash
# Health check
curl http://localhost:8080/health

# User info
curl "http://localhost:8080/player_api.php?username=USER&password=PASS"

# Playlist M3U
curl "http://localhost:8080/get.php?username=USER&password=PASS&type=m3u"
```

### Test Relay

```bash
# Health check
curl http://localhost:8090/health

# Stream (dopo aver avviato l'API e l'ingest)
curl "http://localhost:8090/live/USER/PASS/STREAM_ID.m3u8"
```

## Struttura Dati

Dopo l'ingest, troverai in `./data/`:

- `bundle.json` - Metadati completi (stream, categorie, user info)
- `live.m3u` - Playlist solo live
- `full.m3u` - Playlist completa (live + VOD + series)
- `guide.xml` - EPG/XMLTV

## Problemi Comuni

- **Errore "snapshot not available"**: Esegui prima `pnpm ingest`
- **Porta già in uso**: Cambia `PORT` nel `.env` o ferma altri servizi
- **Stream non funzionano**: Assicurati che il relay sia avviato e `STREAM_RELAY_BASE_URL` sia corretto

