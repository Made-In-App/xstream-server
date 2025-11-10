# Deploy su Render.com

Guida semplice per deployare la piattaforma Xstream su Render.com.

## Prerequisiti

- Account su [Render.com](https://render.com) (gratuito)
- Repository Git (GitHub/GitLab/Bitbucket) con il codice

## Setup Rapido

### 1. Push del Codice

Assicurati che il codice sia su GitHub/GitLab/Bitbucket.

### 2. Deploy Automatico

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Clicca **"New"** → **"Blueprint"**
3. Connetti il tuo repository
4. Render leggerà automaticamente `render.yaml` e creerà 3 servizi:
   - **xstream-api** (API Fastify)
   - **xstream-relay** (Stream proxy Go)
   - **xstream-ingest** (Worker per download dati)

### 3. Configurazione Environment Variables

Per ogni servizio, vai in **Environment** e aggiungi:

#### Per xstream-api:
```
PORT=8080
HOST=0.0.0.0
DATA_ROOT=/app/data
PUBLIC_BASE_URL=https://xstream-api.onrender.com
STREAM_RELAY_BASE_URL=https://xstream-relay.onrender.com
XTREAM_BASE_URL=https://tuo-server-xtream.com
XTREAM_USERNAME=tuo-username
XTREAM_PASSWORD=tua-password
```

#### Per xstream-relay:
```
STREAM_RELAY_PORT=8090
XTREAM_BASE_URL=https://tuo-server-xtream.com
XTREAM_USERNAME=tuo-username
XTREAM_PASSWORD=tua-password
```

#### Per xstream-ingest:
```
STORAGE_ROOT=/app/data
XTREAM_BASE_URL=https://tuo-server-xtream.com
XTREAM_USERNAME=tuo-username
XTREAM_PASSWORD=tua-password
```

### 4. Persistent Disk

**IMPORTANTE**: Sia `xstream-api` che `xstream-ingest` devono usare lo stesso disk:

1. Vai in **Disk** per entrambi i servizi
2. Nome disk: `xstream-data`
3. Mount path: `/app/data`
4. Size: 10 GB

### 5. Esegui Ingest

Dopo il primo deploy, esegui manualmente l'ingest:

1. Vai al servizio `xstream-ingest`
2. Clicca **"Manual Deploy"** → **"Deploy latest commit"**
3. Oppure usa i log per triggerare manualmente

### 6. Scheduling Ingest

Render non supporta cron nativi. Usa un servizio esterno:

1. Vai su [cron-job.org](https://cron-job.org) (gratuito)
2. Crea un nuovo cron job
3. URL: `https://xstream-ingest.onrender.com` (o trigger manuale)
4. Schedule: ogni 6 ore (`0 */6 * * *`)

## Verifica

1. **API Health**: `https://xstream-api.onrender.com/health`
2. **Relay Health**: `https://xstream-relay.onrender.com/health`
3. **Test API**: `https://xstream-api.onrender.com/player_api.php?username=USER&password=PASS`

## URL Finale per Client IPTV

Usa questo URL come server Xtream nei tuoi client:

```
https://xstream-api.onrender.com
```

Con le credenziali che hai configurato in `XTREAM_USERNAME` e `XTREAM_PASSWORD`.

## Note Importanti

- **Cold Start**: I servizi gratuiti vanno in sleep dopo 15 minuti. Il primo accesso può richiedere 30-60 secondi
- **Limiti Free**: 750 ore/mese, 10 GB storage
- **Aggiornamenti**: Ogni push al branch principale triggera automaticamente un nuovo deploy

## Troubleshooting

- **Errori 503**: Verifica che l'ingest sia stato eseguito almeno una volta
- **Stream non funzionano**: Controlla che `STREAM_RELAY_BASE_URL` nell'API punti al relay corretto
- **Disk non condiviso**: Verifica che entrambi i servizi usino lo stesso disk name
