# Sistema di Cache

## Panoramica

Il server implementa un sistema di cache a due livelli:

1. Cache su file fisici - Le playlist scaricate dal server Xtream vengono salvate su disco
2. Cache in memoria - Le playlist parse vengono cachate in memoria per accesso rapido

## Configurazione

Crea il file xtream-config.json nella root del progetto:

```json
{
  "xtream": {
    "url": "https://fn2ilpirata.rearc.xn--t60b56a",
    "username": "Emmgen2",
    "password": "gJWB28F"
  },
  "auth": {
    "enabled": true,
    "users": {
      "user": "pass",
      "admin": "admin123"
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "directory": "./cache"
  }
}
```

## Credenziali Separate

- Credenziali Xtream: Usate per scaricare le playlist dal server Xtream originale (statiche)
- Credenziali Server: Usate per accedere al nostro server (configurabili)

## Funzionamento

### Prima Richiesta

1. Utente fa richiesta con credenziali user/pass
2. Server verifica credenziali utente
3. Server controlla cache valida in ./cache/
4. Se non esiste o scaduta, scarica dal server Xtream usando credenziali statiche
5. Salva playlist in cache su file
6. Restituisce dati all'utente

### Richieste Successive

1. Utente fa richiesta con credenziali
2. Server verifica credenziali utente
3. Server trova cache valida
4. Legge direttamente dalla cache su file
5. Restituisce dati (molto più veloce!)

## Struttura Cache

```
cache/
├── live.m3u
├── live.meta.json
├── vod.m3u
├── vod.meta.json
├── series.m3u
└── series.meta.json
```

## TTL

Il TTL è configurato in secondi (default: 3600 = 1 ora).

## Refresh Manuale

```
GET /refresh-cache?username=user&password=pass&type=all
```

## Note Vercel

Vercel ha filesystem read-only. Per la cache:
- Usa /tmp/cache (temporaneo)
- Oppure configura storage esterno (S3, Vercel Blob, etc.)

