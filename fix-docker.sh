#!/bin/bash

# Script per correggere l'installazione di Docker su Oracle Linux

set -e

echo "🔧 Correzione installazione Docker"
echo "==================================="

# Determina se siamo root
if [ "$EUID" -eq 0 ]; then
    SUDO_CMD=""
else
    SUDO_CMD="sudo"
fi

# Rimuovi il pacchetto docker errato se presente
echo "Rimozione pacchetto docker errato..."
$SUDO_CMD yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true

# Installa yum-utils
echo "Installazione yum-utils..."
$SUDO_CMD yum install -y yum-utils

# Aggiungi repository Docker ufficiale
echo "Aggiunta repository Docker ufficiale..."
$SUDO_CMD yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Installa Docker CE completo
echo "Installazione Docker CE..."
$SUDO_CMD yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Avvia e abilita Docker
echo "Avvio Docker..."
$SUDO_CMD systemctl start docker
$SUDO_CMD systemctl enable docker

# Verifica installazione
if $SUDO_CMD docker --version > /dev/null 2>&1; then
    echo "✅ Docker installato correttamente!"
    $SUDO_CMD docker --version
    echo ""
    echo "Test Docker:"
    $SUDO_CMD docker run hello-world
else
    echo "❌ Errore durante l'installazione"
    exit 1
fi

# Aggiungi utente al gruppo docker (se non siamo root)
if [ "$EUID" -ne 0 ]; then
    echo ""
    echo "Aggiunta utente $USER al gruppo docker..."
    $SUDO_CMD usermod -aG docker $USER
    echo "⚠️  Devi riconnetterti per applicare i cambiamenti del gruppo"
fi

echo ""
echo "🎉 Docker configurato correttamente!"

