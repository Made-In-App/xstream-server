# Deploy su Fly.io

Guida semplice per deployare il servizio unificato Xstream su Fly.io.

## Prerequisiti

- Account Fly.io (gratuito) -> https://fly.io
- CLI Fly installata: `brew install flyctl` oppure `curl -L https://fly.io/install.sh | sh`
- Login: `fly auth login`

## Setup

### 1. Crea l'app con il wizard

Dalla root del progetto:

```bash
fly launch --name xserver --region fra --no-deploy
```

Durante il wizard:
- Quando chiede "Would you like to deploy now?" rispondi **n** (No)
- Scegli "Machines" come piattaforma se richiesto
- Non modificare il file quando propone di aprirlo

### 2. Crea il volume per la cache

```bash
fly volumes create xserver_data --size 3 --region fra --app xserver
```

### 3. Imposta i secrets

```bash
fly secrets set \
  XTREAM_BASE_URL="https://tuo-server-xtream.com" \
  XTREAM_USERNAME="tuo-username" \
  XTREAM_PASSWORD="tua-password" \
  PUBLIC_BASE_URL="https://xserver.fly.dev" \
  --app xserver
```

### 4. Deploy

```bash
fly deploy --app xserver --ha=false
```

L'opzione `--ha=false` evita che Fly crei subito due macchine (una e' sufficiente per iniziare).

## Verifica

```bash
# Health check
curl https://xserver.fly.dev/health

# Test API
curl "https://xserver.fly.dev/player_api.php?username=USER&password=PASS"

# Test relay (via proxy interno)
curl -I "https://xserver.fly.dev/live/USER/PASS/STREAM_ID.m3u8"
```

## Configurazione Client IPTV

Usa questi dati nei tuoi client IPTV:

- **Server URL**: `https://xserver.fly.dev`
- **Username**: (quello configurato in `XTREAM_USERNAME`)
- **Password**: (quello configurato in `XTREAM_PASSWORD`)

## Aggiornamenti

Per aggiornare il servizio dopo modifiche al codice:

```bash
fly deploy --app xserver
```

Il deploy esegue automaticamente l'ingest all'avvio, quindi i dati vengono sempre rigenerati.

## Note

- Il servizio unificato include API + Relay in un solo container
- Il relay Go gira su localhost:8090 e viene proxato da Fastify
- Tutte le richieste esterne vanno su porta 8080 (esposta da Fly)
- Il volume `xserver_data` conserva la cache tra i riavvii

