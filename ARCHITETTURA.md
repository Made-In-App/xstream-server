# Architettura

Panoramica semplice di come funziona la piattaforma.

## Componenti

### 1. Ingest (packages/ingest)

**Cosa fa**: Scarica periodicamente dati dal server Xtream originale.

**Input**: 
- Credenziali Xtream (da .env)
- Server Xtream originale

**Output**:
- `bundle.json` - Metadati completi (stream, categorie, user info)
- `live.m3u` - Playlist solo live
- `full.m3u` - Playlist completa
- `guide.xml` - EPG/XMLTV

**Quando**: Periodicamente (ogni 6 ore) o manualmente.

### 2. API (apps/api)

**Cosa fa**: Serve i dati cached con endpoint compatibili Xtream.

**Endpoint**:
- `/player_api.php` - API Xtream (get_live_streams, get_vod_streams, etc.)
- `/get.php` - Playlist M3U
- `/xmltv.php` - EPG XMLTV

**Dati**: Legge da `bundle.json` e file M3U/XML cached.

**URL Stream**: Genera URL che puntano al relay (non direttamente a Xtream).

### 3. Relay (apps/stream-relay)

**Cosa fa**: Fa proxy degli stream, nascondendo le credenziali Xtream.

**Funzionamento**:
1. Riceve richiesta: `/live/username/password/streamId.m3u8`
2. Verifica credenziali (username/password del proxy)
3. Fa proxy al server Xtream usando credenziali configurate
4. Inoltra lo stream al client

**Vantaggio**: Più client possono vedere lo stesso stream, ma il server Xtream vede sempre una sola connessione (quella del relay).

## Flusso Dati

```
Client IPTV
    ↓
API (xstream-api.onrender.com)
    ↓ (serve metadati cached)
Relay (xstream-relay.onrender.com)
    ↓ (proxy stream)
Server Xtream Originale
```

## Storage Condiviso

Sia API che Ingest condividono lo stesso persistent disk (`/app/data`) su Render:
- API legge i dati cached
- Ingest scrive i nuovi dati

## Multi-Device

Il problema originale: un account Xtream può avere max N connessioni simultanee.

**Soluzione**:
- Ingest scarica i dati una volta
- API serve i metadati cached (nessuna connessione a Xtream)
- Relay fa proxy degli stream (una connessione per canale, condivisa tra client)

Risultato: teoricamente infiniti dispositivi possono usare lo stesso account.
