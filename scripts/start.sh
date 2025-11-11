#!/bin/sh
set -e

echo "[start] Starting Xstream unified service..."

# Step 1: Start ingest loop in background (scarica M3U periodicamente)
echo "[start] Starting ingest loop in background..."
node packages/ingest/dist/ingest-loop.js &
INGEST_PID=$!

# Trap to kill ingest on exit
trap "kill $INGEST_PID 2>/dev/null || true" EXIT

# Wait a moment for first ingest to start
sleep 5
echo "[start] ✓ Ingest loop started (PID: $INGEST_PID)"

# Step 2: Wait for required environment variables (secrets from Fly.io)
echo "[start] Waiting for environment variables..."
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if [ -n "$XTREAM_BASE_URL" ] && [ -n "$XTREAM_USERNAME" ] && [ -n "$XTREAM_PASSWORD" ]; then
    echo "[start] ✓ Environment variables found"
    break
  fi
  echo "[start] Waiting for secrets... ($WAIT_COUNT/$MAX_WAIT)"
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

if [ -z "$XTREAM_BASE_URL" ] || [ -z "$XTREAM_USERNAME" ] || [ -z "$XTREAM_PASSWORD" ]; then
  echo "[start] ERROR: Required environment variables not found after $MAX_WAIT seconds"
  echo "[start] XTREAM_BASE_URL: ${XTREAM_BASE_URL:-NOT SET}"
  echo "[start] XTREAM_USERNAME: ${XTREAM_USERNAME:-NOT SET}"
  echo "[start] XTREAM_PASSWORD: ${XTREAM_PASSWORD:+SET}"
  exit 1
fi

# Step 3: Start relay in background
echo "[start] Starting relay on localhost:8090..."
/app/relay/stream-relay &
RELAY_PID=$!

# Trap to kill relay on exit
trap "kill $RELAY_PID 2>/dev/null || true" EXIT

# Wait a moment for relay to start
sleep 3

# Check if relay is running
if ! kill -0 $RELAY_PID 2>/dev/null; then
  echo "[start] ERROR: Relay failed to start"
  exit 1
fi

# Step 4: Start API server (this becomes PID 1)
echo "[start] Starting API server on port 8080..."
cd apps/api
exec node dist/index.js

