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

## Passo 2: Deploy su Render

### Opzione A: Deploy Automatico (Consigliato)

1. Vai su [dashboard.render.com](https://dashboard.render.com)
2. Clicca **"New"** → **"Blueprint"**
3. Connetti il tuo repository Git
4. Render leggerà `render.yaml` e creerà automaticamente 3 servizi

### Opzione B: Deploy Manuale

Crea 3 servizi separati:

#### Servizio 1: API

1. **"New"** → **"Web Service"**
2. Connetti repository
3. Configurazione:
   - Name: `xstream-api`
   - Environment: `Docker`
   - Dockerfile Path: `./Dockerfile.api`
   - Docker Context: `.`
   - Plan: `Starter` (gratuito)

#### Servizio 2: Relay

1. **"New"** → **"Web Service"**
2. Connetti stesso repository
3. Configurazione:
   - Name: `xstream-relay`
   - Environment: `Docker`
   - Dockerfile Path: `./apps/stream-relay/Dockerfile`
   - Docker Context: `./apps/stream-relay`
   - Plan: `Starter`

#### Servizio 3: Ingest

1. **"New"** → **"Background Worker"**
2. Connetti stesso repository
3. Configurazione:
   - Name: `xstream-ingest`
   - Environment: `Docker`
   - Dockerfile Path: `./Dockerfile.ingest`
   - Docker Context: `.`
   - Plan: `Starter`

## Passo 3: Environment Variables

Per **ogni servizio**, vai in **Environment** e aggiungi:

### Variabili Comuni (tutti e 3 i servizi):

```
XTREAM_BASE_URL=https://tuo-server-xtream.com
XTREAM_USERNAME=tuo-username
XTREAM_PASSWORD=tua-password
```

### Solo per xstream-api:

```
PORT=8080
HOST=0.0.0.0
DATA_ROOT=/app/data
PUBLIC_BASE_URL=https://xstream-api.onrender.com
STREAM_RELAY_BASE_URL=https://xstream-relay.onrender.com
```

### Solo per xstream-relay:

```
STREAM_RELAY_PORT=8090
```

### Solo per xstream-ingest:

```
STORAGE_ROOT=/app/data
```

## Passo 4: Persistent Disk

**CRITICO**: Configura il disk condiviso per API e Ingest.

1. Vai al servizio **xstream-api**
2. Sezione **"Disk"**
3. Clicca **"Create Disk"**
4. Configurazione:
   - Name: `xstream-data`
   - Mount Path: `/app/data`
   - Size: 10 GB
5. Ripeti per **xstream-ingest** (usa lo stesso nome `xstream-data`)

## Passo 5: Primo Ingest

Dopo che tutti i servizi sono deployati:

1. Vai al servizio **xstream-ingest**
2. Clicca **"Manual Deploy"** → **"Deploy latest commit"**
3. Attendi che completi
4. Controlla i log per verificare che abbia scaricato i dati

## Passo 6: Scheduling Ingest

Render non supporta cron nativi. Usa un servizio esterno:

### Opzione A: cron-job.org (Gratuito)

1. Vai su [cron-job.org](https://cron-job.org)
2. Crea account gratuito
3. **"Create cronjob"**
4. Configurazione:
   - Title: `Xstream Ingest`
   - Address: `https://xstream-ingest.onrender.com` (o URL del worker)
   - Schedule: `0 */6 * * *` (ogni 6 ore)
   - Request Method: `GET`

### Opzione B: Manuale

Esegui manualmente quando necessario dal dashboard Render.

## Passo 7: Verifica

### Test Health Checks

```bash
# API
curl https://xstream-api.onrender.com/health

# Relay
curl https://xstream-relay.onrender.com/health
```

### Test API Completa

```bash
curl "https://xstream-api.onrender.com/player_api.php?username=USER&password=PASS"
```

Dovresti vedere la risposta con user_info e server_info.

## Passo 8: Configura Client IPTV

Usa questi dati nei tuoi client IPTV (TiviMate, IPTV Smarters, etc.):

- **Server URL**: `https://xstream-api.onrender.com`
- **Username**: (quello configurato in `XTREAM_USERNAME`)
- **Password**: (quello configurato in `XTREAM_PASSWORD`)

## Troubleshooting

### Servizio non si avvia

- Controlla i log di build in Render dashboard
- Verifica che le variabili d'ambiente siano settate correttamente
- Controlla che i Dockerfile siano corretti

### API restituisce 503

- Verifica che l'ingest sia stato eseguito almeno una volta
- Controlla che il disk sia montato correttamente
- Verifica che `DATA_ROOT` punti a `/app/data`

### Stream non funzionano

- Verifica che il relay sia avviato
- Controlla che `STREAM_RELAY_BASE_URL` nell'API sia corretto
- Verifica le credenziali Xtream nel relay

### Disk non condiviso

- Entrambi i servizi (API e Ingest) devono usare lo stesso disk name: `xstream-data`
- Verifica che il mount path sia `/app/data` per entrambi

## Aggiornamenti

Ogni push al branch principale triggera automaticamente un nuovo deploy per tutti i servizi.

Per deploy manuale:
1. Vai al servizio
2. **"Manual Deploy"** → **"Deploy latest commit"**

## Costi

**Free Tier Render**:
- 750 ore/mese di runtime (sufficiente per 3 servizi 24/7)
- 10 GB storage
- Sleep dopo 15 minuti di inattività (cold start ~30-60 secondi)

**Totale**: Gratuito se rimani nel free tier.

