# Guida al Deploy su Vercel

## Setup Iniziale

### 1. Prepara il Repository

Assicurati che le playlist M3U siano nella cartella playlists/

### 2. Collega a Vercel

#### Opzione A: Via Dashboard Vercel

1. Vai su vercel.com e accedi
2. Clicca su "Add New Project"
3. Importa il repository GitHub/GitLab
4. Vercel rileverà automaticamente la configurazione

#### Opzione B: Via CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

### 3. Configura Variabili d'Ambiente

Nella dashboard Vercel:

1. Vai su Settings > Environment Variables
2. Aggiungi se necessario:
   - LIVE_M3U_PATH
   - VOD_M3U_PATH
   - SERIES_M3U_PATH
   - XSTREAM_URL
   - XSTREAM_USERNAME
   - XSTREAM_PASSWORD
   - CACHE_DIR=/tmp/cache

## Deploy Automatico

### GitHub Actions

Il file .github/workflows/deploy.yml è già configurato.

Setup GitHub Actions:

1. Vai su GitHub > Settings > Secrets and variables > Actions
2. Aggiungi il secret:
   - VERCEL_TOKEN - Ottienilo da Vercel > Settings > Tokens

## Verifica Deploy

Dopo il deploy, verifica:

1. Status Page: https://tuo-dominio.vercel.app/
2. API Test: curl "https://tuo-dominio.vercel.app/player_api.php?username=user&password=pass&action=get_live_streams"
3. M3U Download: curl "https://tuo-dominio.vercel.app/get.php?username=user&password=pass&type=m3u" -o test.m3u

## Troubleshooting

### Errore: Playlist not found
- Verifica che i file M3U siano nella cartella playlists/
- Controlla i path nelle variabili d'ambiente

### Errore: Function timeout
- Le playlist molto grandi (>50MB) potrebbero causare timeout
- Considera storage esterno o CDN

### Errore: Build failed
- Verifica che TypeScript compili: npm run build
- Controlla i log nella dashboard Vercel

## Limitazioni Vercel

- Function Size: Max 50MB (Hobby), 250MB (Pro)
- Timeout: Max 10s (Hobby), 60s (Pro)
- Memory: 1024MB (Hobby), 3008MB (Pro)

Per playlist molto grandi, considera:
- Storage esterno (S3, GitHub Releases)
- Implementare paginazione
- Usare CDN per le playlist

