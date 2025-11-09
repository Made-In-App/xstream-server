# Guida Completa: Git + Deploy Vercel

## Prerequisiti

- Account GitHub/GitLab/Bitbucket
- Account Vercel (gratuito)
- Git installato sul tuo computer
- Node.js 18+ installato

## Step 1: Configurazione Git

### 1.1 Inizializza Git

```bash
cd /Users/emanuelegennuso/LAVORO/PROGETTI/MIEI/xstream-server
git init
```

### 1.2 Configura Git

```bash
git config --global user.name "Il Tuo Nome"
git config --global user.email "tua.email@example.com"
```

### 1.3 Crea il file di configurazione

```bash
cp xtream-config.example.json xtream-config.json
```

## Step 2: Primo Commit

```bash
git add .
git commit -m "Initial commit: Xtream Server with cache system"
```

## Step 3: Crea Repository su GitHub

1. Vai su github.com
2. Clicca su "New" > "New repository"
3. Nome repository: xstream-server
4. Lascia PRIVATO se contiene informazioni sensibili
5. NON inizializzare con README
6. Clicca "Create repository"

### 3.2 Collega il repository

```bash
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 4: Deploy su Vercel

### Opzione A: Deploy via Dashboard

1. Vai su vercel.com
2. Clicca "Add New Project"
3. Importa il repository GitHub
4. Vercel rileverà automaticamente la configurazione
5. Aggiungi variabili d'ambiente se necessario:
   - XSTREAM_URL
   - XSTREAM_USERNAME
   - XSTREAM_PASSWORD
   - CACHE_DIR=/tmp/cache
6. Clicca "Deploy"

### Opzione B: Deploy via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Step 5: Deploy Automatico

1. Vai su GitHub > Settings > Secrets and variables > Actions
2. Aggiungi il secret VERCEL_TOKEN
3. Ottieni il token da Vercel > Settings > Tokens

Ora ogni push su main triggerà automaticamente il deploy.

## Verifica Deploy

```bash
# Status page
curl https://tuo-dominio.vercel.app/

# Test API
curl "https://tuo-dominio.vercel.app/player_api.php?username=user&password=pass&action=get_live_streams"

# Test M3U
curl "https://tuo-dominio.vercel.app/get.php?username=user&password=pass&type=m3u" -o test.m3u
```

## Troubleshooting

### Errore: Build failed
```bash
npm run build
```

### Errore: Playlist not found
- Verifica variabili d'ambiente in Vercel
- Controlla i log nella dashboard Vercel

### Errore: Cache directory not writable
Su Vercel usa: CACHE_DIR=/tmp/cache

