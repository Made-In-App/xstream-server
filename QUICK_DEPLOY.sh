#!/bin/bash

# Script rapido per setup Git e deploy Vercel

set -e

echo "🚀 Xtream Server - Quick Deploy Script"
echo "======================================"
echo ""

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Verifica prerequisiti
print_info "Verifica prerequisiti..."

if ! command -v git &> /dev/null; then
    print_error "Git non trovato. Installa Git da https://git-scm.com"
    exit 1
fi
print_success "Git trovato: $(git --version)"

if ! command -v node &> /dev/null; then
    print_error "Node.js non trovato. Installa Node.js 18+ da https://nodejs.org"
    exit 1
fi
print_success "Node.js trovato: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm non trovato"
    exit 1
fi
print_success "npm trovato: $(npm --version)"

echo ""

# Step 1: Configurazione Git
print_info "Step 1: Configurazione Git"

if [ ! -d ".git" ]; then
    print_info "Inizializzazione repository Git..."
    git init
    print_success "Repository Git inizializzato"
else
    print_success "Repository Git già esistente"
fi

# Verifica configurazione Git
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
    print_error "Git non configurato. Configura nome e email:"
    echo "  git config --global user.name \"Il Tuo Nome\""
    echo "  git config --global user.email \"tua.email@example.com\""
    exit 1
fi
print_success "Git configurato: $(git config user.name) <$(git config user.email)>"

# Crea xtream-config.json se non esiste
if [ ! -f "xtream-config.json" ]; then
    print_info "Creazione xtream-config.json da esempio..."
    cp xtream-config.example.json xtream-config.json
    print_success "File xtream-config.json creato"
    print_info "IMPORTANTE: Modifica xtream-config.json con le tue credenziali!"
else
    print_success "xtream-config.json già esistente"
fi

echo ""

# Step 2: Installazione dipendenze
print_info "Step 2: Installazione dipendenze"

if [ ! -d "node_modules" ]; then
    print_info "Installazione npm packages..."
    npm install
    print_success "Dipendenze installate"
else
    print_success "Dipendenze già installate"
fi

echo ""

# Step 3: Build
print_info "Step 3: Compilazione TypeScript"

npm run build

if [ $? -eq 0 ]; then
    print_success "Build completato"
else
    print_error "Build fallito. Controlla gli errori sopra."
    exit 1
fi

echo ""

# Step 4: Git status
print_info "Step 4: Stato Git"

git status

echo ""
print_info "Prossimi passi manuali:"
echo ""
echo "1. Crea repository su GitHub:"
echo "   - Vai su https://github.com/new"
echo "   - Crea un nuovo repository (privato o pubblico)"
echo "   - NON inizializzare con README"
echo ""
echo "2. Collega e push:"
echo "   git remote add origin https://github.com/USERNAME/REPO_NAME.git"
echo "   git add ."
echo "   git commit -m \"Initial commit\""
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Deploy su Vercel:"
echo "   - Vai su https://vercel.com"
echo "   - Importa il repository GitHub"
echo "   - Configura variabili d'ambiente se necessario"
echo "   - Clicca Deploy"
echo ""
echo "Oppure usa Vercel CLI:"
echo "   npm i -g vercel"
echo "   vercel login"
echo "   vercel --prod"
echo ""
print_success "Script completato!"

