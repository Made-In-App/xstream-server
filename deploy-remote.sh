#!/bin/bash

# Script per deploy remoto su Oracle Cloud usando la chiave SSH
# Questo script carica i file sulla VM e esegue il deploy

set -e

# Configurazione
ORACLE_IP="84.8.248.50"
ORACLE_USER="opc"  # Utente predefinito Oracle Cloud
SSH_KEY="ssh-key-2025-11-23.key"
PROJECT_DIR="xstream-server"

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Deploy Remoto su Oracle Cloud"
echo "================================"
echo ""

# Verifica che la chiave SSH esista
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ Chiave SSH non trovata: $SSH_KEY${NC}"
    exit 1
fi

# Imposta i permessi corretti per la chiave SSH
chmod 600 "$SSH_KEY"

# Verifica la connessione SSH
echo -e "${YELLOW}🔍 Verifica connessione SSH...${NC}"
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$ORACLE_USER@$ORACLE_IP" "echo 'Connessione OK'" 2>/dev/null; then
    echo -e "${GREEN}✅ Connessione SSH riuscita${NC}"
else
    echo -e "${RED}❌ Impossibile connettersi alla VM${NC}"
    echo "Verifica:"
    echo "  - Che l'IP sia corretto: $ORACLE_IP"
    echo "  - Che le Security Rules permettano SSH (porta 22)"
    echo "  - Che la chiave SSH sia corretta"
    exit 1
fi

# Carica i file sulla VM
echo -e "${YELLOW}📦 Caricamento file sulla VM...${NC}"

# Crea la directory sulla VM
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$ORACLE_USER@$ORACLE_IP" "mkdir -p ~/$PROJECT_DIR"

# Usa rsync se disponibile, altrimenti scp
if command -v rsync &> /dev/null; then
    echo "Usando rsync per il trasferimento..."
    rsync -avz --progress \
        --exclude='vendor/' \
        --exclude='.git/' \
        --exclude='*.apk' \
        --exclude='*.zip' \
        --exclude='*.log' \
        --exclude='.env' \
        --exclude='ssh-key-*.key' \
        -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
        ./ "$ORACLE_USER@$ORACLE_IP:~/$PROJECT_DIR/"
else
    echo "Usando scp per il trasferimento..."
    # Crea un archivio temporaneo escludendo file non necessari
    tar --exclude='vendor' \
        --exclude='.git' \
        --exclude='*.apk' \
        --exclude='*.zip' \
        --exclude='*.log' \
        --exclude='.env' \
        --exclude='ssh-key-*.key' \
        -czf /tmp/xstream-server-deploy.tar.gz .
    
    # Carica l'archivio
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no /tmp/xstream-server-deploy.tar.gz "$ORACLE_USER@$ORACLE_IP:~/$PROJECT_DIR/"
    
    # Estrai sulla VM
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$ORACLE_USER@$ORACLE_IP" "cd ~/$PROJECT_DIR && tar -xzf xstream-server-deploy.tar.gz && rm xstream-server-deploy.tar.gz"
    
    # Rimuovi l'archivio locale
    rm /tmp/xstream-server-deploy.tar.gz
fi

echo -e "${GREEN}✅ File caricati sulla VM${NC}"

# Verifica e correggi Docker se necessario
echo ""
echo -e "${YELLOW}🔧 Verifica installazione Docker...${NC}"
DOCKER_NEEDS_FIX=false

# Controlla se Docker funziona
if ! ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$ORACLE_USER@$ORACLE_IP" "command -v docker > /dev/null 2>&1 && sudo systemctl is-active --quiet docker 2>/dev/null" 2>/dev/null; then
    DOCKER_NEEDS_FIX=true
fi

if [ "$DOCKER_NEEDS_FIX" = true ]; then
    echo "Docker non è installato correttamente, correzione in corso..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$ORACLE_USER@$ORACLE_IP" << 'ENDSSH'
    # Rimuovi pacchetti docker errati
    sudo yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true
    
    # Installa yum-utils
    sudo yum install -y yum-utils
    
    # Aggiungi repository Docker ufficiale
    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    
    # Installa Docker CE completo
    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Avvia e abilita Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Aggiungi utente al gruppo docker
    sudo usermod -aG docker opc
    
    echo "✅ Docker installato correttamente!"
ENDSSH
else
    echo "✅ Docker è già installato e funzionante"
fi

# Esegui il deploy sulla VM
echo ""
echo -e "${YELLOW}🚀 Esecuzione deploy sulla VM...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$ORACLE_USER@$ORACLE_IP" << 'ENDSSH'
cd ~/xstream-server
chmod +x deploy.sh fix-docker.sh 2>/dev/null || true

    # Verifica se docker funziona senza sudo
    if docker ps > /dev/null 2>&1; then
        # Docker funziona, usa deploy.sh normale (modalità non interattiva)
        NON_INTERACTIVE=1 ./deploy.sh
else
    # Docker richiede sudo, esegui i comandi manualmente con sudo
    echo "Docker richiede sudo, esecuzione manuale..."
    
    # Verifica Docker Compose (usa docker compose plugin se disponibile)
    if ! command -v docker-compose &> /dev/null && ! docker compose version > /dev/null 2>&1; then
        echo "Installazione Docker Compose standalone..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    # Usa docker compose plugin se disponibile, altrimenti docker-compose
    if docker compose version > /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    # Crea directory iptv se non esiste
    mkdir -p iptv
    
    # Build dell'immagine
    echo "Building Docker image..."
    sudo $DOCKER_COMPOSE_CMD build
    
    # Avvia i container
    echo "Avvio container..."
    sudo $DOCKER_COMPOSE_CMD up -d
    
    # Attendi che il container sia pronto
    sleep 5
    
    # Verifica lo stato
    if sudo $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
        echo "✅ Container avviato con successo!"
        sudo $DOCKER_COMPOSE_CMD ps
        echo ""
        echo "📋 Log recenti:"
        sudo $DOCKER_COMPOSE_CMD logs --tail=20
    else
        echo "❌ Errore durante l'avvio del container"
        sudo $DOCKER_COMPOSE_CMD logs
        exit 1
    fi
fi
ENDSSH

echo ""
echo -e "${GREEN}🎉 Deploy completato!${NC}"
echo ""
echo "L'applicazione è disponibile su:"
echo "  http://84.8.248.50:8080/iptv.m3u?username=<USER>&password=<PASSWORD>"
echo ""
echo "Per controllare i log:"
echo "  ssh -i $SSH_KEY $ORACLE_USER@$ORACLE_IP 'cd ~/xstream-server && docker-compose logs -f'"

