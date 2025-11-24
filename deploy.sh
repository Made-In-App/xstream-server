#!/bin/bash

# Script di deploy per Oracle Cloud Free Tier
# Questo script automatizza il processo di deploy

set -e

echo "🚀 Script di Deploy IPTV Proxy su Oracle Cloud"
echo "=============================================="

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica che siamo sulla VM Oracle
if [ ! -f /etc/oracle-release ] && [ ! -d /etc/oracle-cloud-agent ]; then
    echo -e "${YELLOW}⚠️  Attenzione: Non sembra essere una VM Oracle Cloud${NC}"
    read -p "Vuoi continuare comunque? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Determina se siamo root o meno
if [ "$EUID" -eq 0 ]; then
    SUDO_CMD=""
    DOCKER_GROUP_CMD="usermod -aG docker"
else
    SUDO_CMD="sudo"
    DOCKER_GROUP_CMD="sudo usermod -aG docker"
fi

# Verifica Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker non è installato${NC}"
    echo "Installazione Docker..."
    $SUDO_CMD yum update -y
    
    # Installa yum-utils se non presente
    $SUDO_CMD yum install -y yum-utils
    
    # Aggiungi repository Docker ufficiale (funziona su Oracle Linux/CentOS/RHEL)
    echo "Aggiunta repository Docker ufficiale..."
    $SUDO_CMD yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    
    # Installa Docker CE (Community Edition) completo
    echo "Installazione Docker CE..."
    $SUDO_CMD yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Avvia e abilita Docker
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker
    
    # Verifica che Docker funzioni
    if $SUDO_CMD docker --version > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker installato e avviato correttamente${NC}"
    else
        echo -e "${RED}❌ Errore durante l'installazione di Docker${NC}"
        exit 1
    fi
    
    if [ "$EUID" -ne 0 ]; then
        $DOCKER_GROUP_CMD $USER
        echo -e "${YELLOW}⚠️  Devi riconnetterti per applicare i cambiamenti del gruppo${NC}"
        exit 0
    fi
elif ! $SUDO_CMD systemctl is-active --quiet docker 2>/dev/null; then
    # Docker è installato ma non in esecuzione
    echo -e "${YELLOW}⚠️  Docker installato ma non in esecuzione, avvio...${NC}"
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker
fi

# Verifica Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose non è installato${NC}"
    echo "Installazione Docker Compose..."
    $SUDO_CMD curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO_CMD chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installato${NC}"
fi

# Verifica che docker-compose.yml esista
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ File docker-compose.yml non trovato${NC}"
    echo "Assicurati di essere nella directory del progetto"
    exit 1
fi

# Verifica che Dockerfile esista
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ File Dockerfile non trovato${NC}"
    exit 1
fi

# Ottieni IP pubblico
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "localhost")
echo -e "${GREEN}📍 IP Pubblico rilevato: $PUBLIC_IP${NC}"

# Mostra informazioni (senza chiedere conferma se NON_INTERACTIVE è impostato)
echo ""
echo "Il deploy procederà con:"
echo "  - IP Pubblico: $PUBLIC_IP"
echo "  - Porta: 8080"
echo ""

# Chiedi conferma solo se NON_INTERACTIVE non è impostato
if [ -z "$NON_INTERACTIVE" ]; then
    read -p "Vuoi procedere? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "Modalità non interattiva: procedo automaticamente..."
fi

# Crea directory iptv se non esiste
mkdir -p iptv

# Build dell'immagine
echo ""
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker-compose build

# Avvia i container
echo ""
echo -e "${YELLOW}🚀 Avvio container...${NC}"
docker-compose up -d

# Attendi che il container sia pronto
echo ""
echo -e "${YELLOW}⏳ Attendo che il container sia pronto...${NC}"
sleep 5

# Verifica lo stato
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Container avviato con successo!${NC}"
    echo ""
    echo "📊 Stato container:"
    docker-compose ps
    echo ""
    echo "📋 Log recenti:"
    docker-compose logs --tail=20
    echo ""
    echo -e "${GREEN}🎉 Deploy completato!${NC}"
    echo ""
    echo "Per testare l'applicazione:"
    echo "  curl \"http://$PUBLIC_IP:8080/iptv.m3u?username=<USER>&password=<PASSWORD>\""
    echo ""
    echo "Comandi utili:"
    echo "  - Log: docker-compose logs -f"
    echo "  - Stop: docker-compose down"
    echo "  - Restart: docker-compose restart"
else
    echo -e "${RED}❌ Errore durante l'avvio del container${NC}"
    echo "Log:"
    docker-compose logs
    exit 1
fi

