# Test del Servizio Xstream

## 1. Health Check

```bash
curl https://xstream-server.fly.dev/health
```

Dovrebbe restituire: `{"status":"ok"}`

## 2. Test API - User Info

```bash
curl "https://xstream-server.fly.dev/player_api.php?username=Emmgen2&password=gJWB28F"
```

Dovrebbe restituire informazioni sull'utente e sul server.

## 3. Test API - Live Streams

```bash
curl "https://xstream-server.fly.dev/player_api.php?username=Emmgen2&password=gJWB28F&action=get_live_streams" | head -20
```

Dovrebbe restituire una lista di stream live.

## 4. Test M3U Playlist

```bash
curl "https://xstream-server.fly.dev/get.php?username=Emmgen2&password=gJWB28F&type=m3u" | head -20
```

Dovrebbe restituire una playlist M3U con URL che puntano al relay.

## 5. Test EPG (XMLTV)

```bash
curl "https://xstream-server.fly.dev/xmltv.php?username=Emmgen2&password=gJWB28F" | head -30
```

Dovrebbe restituire il file XMLTV con la guida programmi.

## 6. Test Relay (Stream)

Prendi un ID stream dalla lista (es. dal test #3) e prova:

```bash
# Sostituisci STREAM_ID con un ID reale dalla lista
curl -I "https://xstream-server.fly.dev/live/Emmgen2/gJWB28F/STREAM_ID.m3u8"
```

Dovrebbe restituire headers HTTP 200 o 302 (redirect).

## 7. Verifica Logs

```bash
fly logs --app xstream-server
```

Cerca messaggi come:
- `✓ Environment variables found`
- `Starting relay on localhost:8090`
- `API listening at`

## 8. Test Completo con Client IPTV

Configura un client IPTV (es. VLC, Kodi, TiviMate) con:
- **Server URL**: `https://xstream-server.fly.dev`
- **Username**: `Emmgen2`
- **Password**: `gJWB28F`

## Troubleshooting

Se qualcosa non funziona:

1. **Verifica che le macchine siano running**:
   ```bash
   fly machine list --app xstream-server
   ```

2. **Controlla i logs in tempo reale**:
   ```bash
   fly logs --app xstream-server --follow
   ```

3. **Verifica le variabili d'ambiente**:
   ```bash
   fly ssh console --app xstream-server
   # Poi dentro la console:
   env | grep XTREAM
   ```

4. **Riavvia le macchine se necessario**:
   ```bash
   fly machine restart <MACHINE_ID> --app xstream-server
   ```

