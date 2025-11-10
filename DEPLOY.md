# Deploy su Render.com

Guida semplice per deployare la piattaforma Xstream su Render.com.

## Prerequisiti

- Account su [Render.com](https://render.com) (gratuito)
- Repository Git (GitHub/GitLab/Bitbucket) con il codice
- Credenziali Xtream (URL, username, password)

## Setup Rapido

### 1. Push del Codice

Assicurati che il codice sia su GitHub/GitLab/Bitbucket.

### 2. Deploy Automatico (Blueprint)

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Clicca **"New"** → **"Blueprint"**
3. Connetti il tuo repository
4. Render leggerà automaticamente `render.yaml` e creerà **due servizi**:
   - **xstream-api** (API Fastify + ingest on boot)
   - **xstream-relay** (Stream proxy Go)

### 3. Configurazione Environment Variables

Per ogni servizio, vai in **Environment** e aggiungi:

#### Per xstream-api
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

> Nota: il `Dockerfile.api` esegue automaticamente `pnpm --filter @xstream/ingest ingest` prima di avviare l'API, quindi non serve un servizio ingest separato.

#### Per xstream-relay
```
STREAM_RELAY_PORT=8090
XTREAM_BASE_URL=https://tuo-server-xtream.com
XTREAM_USERNAME=tuo-username
XTREAM_PASSWORD=tua-password
```

### 4. Flusso di Deploy

1. Render builda l'immagine Docker.
2. Al boot dell'API, viene eseguito l'ingest che scarica playlist/EPG localmente.
3. L'API parte e serve i dati appena generati.
4. Il relay resta attivo per proxare gli stream.

### 5. Aggiornare i Dati Periodicamente

- Ogni nuovo deploy o riavvio esegue automaticamente l'ingest.
- Per forzare un aggiornamento, puoi usare un **Deploy Hook** di Render e richiamarlo da un cron esterno (es. [cron-job.org](https://cron-job.org)).
- Frequenza consigliata: ogni 30-60 minuti, in base a quanto spesso cambiano le playlist.

### 6. Verifica

1. **API Health**: `https://xstream-api.onrender.com/health`
2. **Relay Health**: `https://xstream-relay.onrender.com/health`
3. **Test API**: `https://xstream-api.onrender.com/player_api.php?username=USER&password=PASS`

### 7. Configurazione Client IPTV

Usa questo URL come server Xtream nei tuoi client:
```
https://xstream-api.onrender.com
```
Username/Password sono quelli impostati in `XTREAM_USERNAME` e `XTREAM_PASSWORD`.

## Note Importanti

- Piano **free** Render: nessuna carta richiesta. Il filesystem è effimero; l'ingest gira ad ogni avvio per rigenerare i dati.
- Se vuoi persistenza anche across reboot senza ingest, valuta piani a pagamento o un VPS.
- Il relay usa sempre le credenziali Xtream interne: non vengono esposte agli utenti finali.

## Troubleshooting

- **API restituisce 503**: il primo avvio richiede tempo per completare l'ingest. Aspetta qualche secondo/minuto.
- **Playlist vuote**: forza un redeploy dell'API o verifica le credenziali Xtream.
- **Stream non partono**: controlla che `STREAM_RELAY_BASE_URL` punti correttamente al relay e che quest'ultimo sia up.
- **Aggiornamenti lenti**: aumenta la frequenza dei cron che richiamano il Deploy Hook dell'API.
