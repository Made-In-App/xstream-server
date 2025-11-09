# Quick Start

## Installazione Rapida

```bash
npm install
npm run build
ls -la playlists/
npm run dev
```

## Deploy Vercel

### Via Dashboard:
1. Vai su vercel.com
2. Clicca "Add New Project"
3. Importa repository GitHub
4. Clicca "Deploy"

### Via CLI:
```bash
npm i -g vercel
vercel login
vercel --prod
```

## Test

```bash
curl https://tuo-dominio.vercel.app/
curl "https://tuo-dominio.vercel.app/player_api.php?username=user&password=pass&action=get_live_streams"
curl "https://tuo-dominio.vercel.app/get.php?username=user&password=pass&type=m3u_plus" -o playlist.m3u
```

## Configurazione Player

- URL: https://tuo-dominio.vercel.app
- Username: user
- Password: pass

Vedi INSTALL.md per la guida completa.

