# Installazione e Deploy

## Installazione Locale

### Prerequisiti

- Node.js 18.x o superiore
- npm o yarn
- Git

### Setup

```bash
cd xstream-server
npm install
npm run build
ls -la api/
```

### Configura Playlist

```bash
mkdir -p playlists
# Copia le playlist M3U nella cartella playlists/
```

### Test Locale

```bash
npm run dev
```

## Deploy su Vercel

### Opzione 1: Deploy via Dashboard

1. Prepara il Repository:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Collega a Vercel:
   - Vai su vercel.com
   - Clicca "Add New Project"
   - Importa repository GitHub

3. Configura Variabili d'Ambiente:
   - Settings > Environment Variables
   - Aggiungi se necessario

4. Deploy:
   - Clicca "Deploy"

### Opzione 2: Deploy via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Verifica Deploy

```bash
curl https://tuo-dominio.vercel.app/
curl "https://tuo-dominio.vercel.app/player_api.php?username=user&password=pass&action=get_live_streams"
curl "https://tuo-dominio.vercel.app/get.php?username=user&password=pass&type=m3u" -o test.m3u
```

## Troubleshooting

### Errore: Cannot find module
- Esegui npm install di nuovo
- Verifica che node_modules esista

### Errore: Playlist not found
- Verifica che i file M3U siano in playlists/
- Controlla i path in src/config.ts

### Errore Build Vercel
- Controlla i log nella dashboard Vercel
- Verifica che TypeScript compili: npm run build

### Timeout Vercel
- Le playlist molto grandi (>50MB) potrebbero causare timeout
- Considera storage esterno (S3, GitHub Releases)

## Comandi Utili

```bash
npm run build
npm run type-check
npm run lint
npm run dev
vercel --prod
```

