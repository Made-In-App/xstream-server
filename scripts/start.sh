#!/bin/sh
set -e

echo "[start] Starting Xstream unified service..."

# Step 1: Run ingest to populate cache
echo "[start] Running ingest..."
if ! node packages/ingest/dist/index.js; then
  echo "[start] WARNING: Ingest failed, continuing anyway..."
fi

# Step 2: Start relay in background
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

# Step 3: Start API server (this becomes PID 1)
echo "[start] Starting API server on port 8080..."
cd apps/api
exec node dist/index.js

