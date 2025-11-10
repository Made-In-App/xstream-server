# Istruzioni Deploy Completo

Guida passo-passo per deployare su Render.com.

## Passo 1: Preparazione Codice

1. Assicurati che tutto il codice sia committato
2. Push su GitHub/GitLab/Bitbucket
3. Verifica che questi file esistano:
   - `render.yaml`
   - `Dockerfile.api`
   - `Dockerfile.ingest`
   - `apps/stream-relay/Dockerfile`

## Passo 2: Deploy via Blueprint (Consigliato)

1. Vai su [dashboard.render.com](https://dashboard.render.com)
2. Clicca **"New"** → **"Blueprint"**
3. Connetti il tuo repository Git
4. Render creerà due servizi:
   - `xstream-api` (esegue l'ingest all'avvio e avvia l'API)
   - `xstream-relay`

## Passo 3: Environment Variables

### xstream-api
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

> Il comando di avvio nel `Dockerfile.api` è `sh -c "pnpm --filter @xstream/ingest ingest && node dist/index.js"`, quindi l'ingest gira automaticamente prima dell'API.

### xstream-relay
```
STREAM_RELAY_PORT=8090
XTREAM_BASE_URL=https://tuo-server-xtream.com
XTREAM_USERNAME=tuo-username
XTREAM_PASSWORD=tua-password
```

## Passo 4: Flusso di Deploy

1. Render builda le immagini Docker.
2. L'avvio di `xstream-api` esegue l'ingest (scarica playlist, metadati, EPG) e poi avvia l'API.
3. `xstream-relay` si avvia e proxy gli stream.

## Passo 5: Aggiornare i Dati Periodicamente

- Ogni riavvio/nuovo deploy esegue automaticamente l'ingest.
- Per aggiornamenti programmati:
  1. Vai in **Settings → Deploy Hooks** del servizio API e genera un hook "Manual Deploy".
  2. Copia l'URL.
  3. Usa un servizio cron esterno (es. [cron-job.org](https://cron-job.org)) per eseguire una richiesta POST/GET all'hook ogni 30-60 minuti.
  4. Ogni chiamata forza un redeploy: l'API si riavvia, esegue l'ingest, riparte con dati freschi.

## Passo 6: Verifica

1. `curl https://xstream-api.onrender.com/health`
2. `curl https://xstream-relay.onrender.com/health`
3. `curl "https://xstream-api.onrender.com/player_api.php?username=USER&password=PASS"`

## Passo 7: Configurare i Client IPTV

Server URL: `https://xstream-api.onrender.com`
Username/Password: quelli configurati nelle variabili d'ambiente.

## Troubleshooting

- **API lenta al primo avvio**: sta eseguendo l'ingest; attendi qualche minuto.
- **Playlist vuote**: verifica credenziali Xtream o forza un redeploy.
- **Stream in errore**: controlla che il relay sia up e che l'URL `STREAM_RELAY_BASE_URL` sia corretto.
- **Aggiornamenti automatici**: se il cron non funziona, controlla i log del servizio cron o usa un altro provider.

## Costi

- Piano **free** di Render (nessuna carta richiesta). Il filesystem è effimero ma l'ingest gira ad ogni avvio, quindi non serve storage persistente.

