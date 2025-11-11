#!/bin/bash
set -e

APP_NAME="xstream-server"
REGION="fra"

echo "=== Deploy completo Fly.io ==="

# Carica .env.fly se esiste (metodo semplificato)
if [ -f .env.fly ]; then
  echo "Caricando .env.fly..."
  # Leggi solo le variabili necessarie
  export XTREAM_BASE_URL=$(grep "^XTREAM_BASE_URL=" .env.fly | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
  export XTREAM_USERNAME=$(grep "^XTREAM_USERNAME=" .env.fly | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
  export XTREAM_PASSWORD=$(grep "^XTREAM_PASSWORD=" .env.fly | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
  echo "✓ Variabili caricate"
fi

# 1. Distruggi tutto e ricrea da zero
echo "[1/7] Distruggendo app esistente (se presente)..."
if fly apps show $APP_NAME &>/dev/null 2>&1; then
  echo "  Rimuovendo app $APP_NAME e tutte le risorse..."
  # Rimuovi tutte le macchine
  fly machine list --app $APP_NAME 2>/dev/null | grep "machine" | awk '{print $1}' | while read machine_id; do
    [ -n "$machine_id" ] && fly machine remove "$machine_id" --app $APP_NAME --force 2>/dev/null || true
  done
  # Rimuovi i volumi
  fly volumes list --app $APP_NAME 2>/dev/null | grep "xstream_data" | awk '{print $2}' | while read vol_id; do
    [ -n "$vol_id" ] && fly volumes destroy "$vol_id" --app $APP_NAME --yes 2>/dev/null || true
  done
  # Distruggi l'app
  fly apps destroy $APP_NAME --yes 2>/dev/null || true
  sleep 3
  echo "  ✓ App distrutta"
fi

# 2. Crea app nuova
echo "[2/7] Creando app nuova..."
fly apps create $APP_NAME --machines
sleep 2

# 3. Crea volume
echo "[3/7] Creando volume..."
fly volumes create xstream_data --size 3 --region $REGION --app $APP_NAME
echo "  ✓ Volume creato"

# 4. Crea macchina temporanea (necessaria prima dei secrets)
echo "[4/7] Creando macchina temporanea..."
fly machine run nginx:alpine \
  --app $APP_NAME \
  --region $REGION \
  --name temp-init \
  --vm-size shared-cpu-1x \
  --vm-memory 256 \
  --port 80:80/tcp
sleep 5
echo "  ✓ Macchina temporanea creata"

# 5. Deploy (crea l'immagine e le macchine)
echo "[5/7] Eseguendo deploy..."
cd "$(dirname "$0")/.."
fly deploy --app $APP_NAME --ha=false

# 6. Variabili già nel fly.toml, nessun bisogno di secrets
echo "[6/7] Variabili d'ambiente configurate in fly.toml"
echo "  ✓ Le variabili XTREAM_* sono già nel fly.toml e verranno iniettate automaticamente"

# 7. Rimuovi macchina temporanea se esiste
echo "[7/7] Pulizia macchina temporanea..."
fly machine remove temp-init --app $APP_NAME --force 2>/dev/null || true

echo ""
echo "=== Deploy completato! ==="
echo "URL: https://${APP_NAME}.fly.dev"
echo "Health: curl https://${APP_NAME}.fly.dev/health"
echo "Logs: fly logs --app $APP_NAME"

