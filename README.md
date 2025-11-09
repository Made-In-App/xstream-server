# Xtream Server

Server Xtream Codes API implementato in Node.js/TypeScript per Vercel.

## Caratteristiche

- API completa compatibile con Xtream Codes
- Supporto Live, VOD e Serie TV
- Generazione playlist M3U
- Categorizzazione automatica
- Cache delle playlist per performance
- Deploy automatico su Vercel
- Serverless functions ottimizzate

## Requisiti

- Node.js 18.x o superiore
- npm o yarn
- Account Vercel (per deploy)

## Installazione Locale

1. Installa le dipendenze:
   ```bash
   npm install
   ```

2. Configura le playlist M3U:
   - Crea la cartella playlists/ nella root del progetto
   - Copia i file M3U

3. Sviluppo locale:
   ```bash
   npm run dev
   ```

## Deploy su Vercel

Vedi GIT_AND_DEPLOY.md per la guida completa al deploy.

## Endpoint API

### Player API
GET /player_api.php?username=USER&password=PASS&action=ACTION

Azioni disponibili:
- get_live_streams - Lista canali live
- get_vod_streams - Lista film VOD
- get_series - Lista serie TV
- get_live_categories - Categorie live
- get_vod_categories - Categorie VOD
- get_series_categories - Categorie serie
- get_user_info - Info utente

### Playlist M3U
GET /get.php?username=USER&password=PASS&type=TYPE

Tipi disponibili:
- m3u - Solo canali live
- m3u_plus - Live + VOD + Serie

## Configurazione

Crea il file xtream-config.json nella root del progetto.
Vedi xtream-config.example.json per un esempio.

## Licenza

MIT

