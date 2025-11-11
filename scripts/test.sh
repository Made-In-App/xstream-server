#!/bin/bash

APP_NAME="xstream-server"

echo "=== Test Xstream Server ==="
echo ""

# Ottieni l'URL corretto
echo "1. Verificando URL dell'app..."
HOSTNAME=$(fly info --app $APP_NAME 2>/dev/null | grep -i "hostname" | awk '{print $2}' || echo "${APP_NAME}.fly.dev")
echo "   Hostname: $HOSTNAME"
echo ""

# Test health check
echo "2. Test Health Check..."
curl -s "https://${HOSTNAME}/health" && echo "" || echo "   ❌ Health check fallito"
echo ""

# Test API
echo "3. Test API (user info)..."
curl -s "https://${HOSTNAME}/player_api.php?username=Emmgen2&password=gJWB28F" | head -5
echo ""

# Test M3U
echo "4. Test M3U Playlist..."
curl -s "https://${HOSTNAME}/get.php?username=Emmgen2&password=gJWB28F&type=m3u" | head -5
echo ""

echo "=== Test completati ==="
echo ""
echo "Per vedere i logs:"
echo "  fly logs --app $APP_NAME"

