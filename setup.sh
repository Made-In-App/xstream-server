#!/bin/bash

echo "🚀 Xtream Server - Setup Script"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato. Installa Node.js 18+ da https://nodejs.org"
    exit 1
fi

echo "✓ Node.js trovato: $(node --version)"
echo "✓ npm trovato: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installazione dipendenze..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Errore durante l'installazione delle dipendenze"
    exit 1
fi

echo "✓ Dipendenze installate"
echo ""

# Build TypeScript
echo "🔨 Compilazione TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Errore durante la compilazione TypeScript"
    exit 1
fi

echo "✓ TypeScript compilato"
echo ""

# Check playlists
echo "📺 Verifica playlist M3U..."
if [ ! -d "playlists" ]; then
    echo "⚠️  Cartella playlists non trovata. Creazione..."
    mkdir -p playlists
fi

if [ ! -f "playlists/xtream_Emmgen2_LIVE.m3u" ]; then
    echo "⚠️  File LIVE.m3u non trovato in playlists/"
fi

if [ ! -f "playlists/xtream_Emmgen2_VOD.m3u" ]; then
    echo "⚠️  File VOD.m3u non trovato in playlists/"
fi

if [ ! -f "playlists/xtream_Emmgen2_SERIES.m3u" ]; then
    echo "⚠️  File SERIES.m3u non trovato in playlists/"
fi

echo ""
echo "✅ Setup completato!"
echo ""
echo "Prossimi passi:"
echo "1. Aggiungi le playlist M3U nella cartella playlists/"
echo "2. Per test locale: npm run dev"
echo "3. Per deploy Vercel: vercel --prod"
echo ""

