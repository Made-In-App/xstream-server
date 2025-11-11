# Multi-stage build: Go relay
FROM golang:1.22-alpine AS relay-builder

WORKDIR /app/relay

COPY apps/stream-relay/go.mod apps/stream-relay/go.sum* ./
COPY apps/stream-relay/main.go ./

RUN go mod tidy && go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o stream-relay .

# Multi-stage build: Node.js API
FROM node:20-alpine AS node-builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/ingest/package.json ./packages/ingest/
COPY apps/api/package.json ./apps/api/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/core ./packages/core
COPY packages/ingest ./packages/ingest
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter @xstream/core build
RUN pnpm --filter @xstream/ingest build
RUN pnpm --filter api build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install Go runtime for relay (or copy static binary)
COPY --from=relay-builder /app/relay/stream-relay /app/relay/stream-relay
RUN chmod +x /app/relay/stream-relay

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/ingest/package.json ./packages/ingest/
COPY apps/api/package.json ./apps/api/

# Install pnpm
RUN npm install -g pnpm

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=node-builder /app/packages/core/dist ./packages/core/dist
COPY --from=node-builder /app/packages/ingest/dist ./packages/ingest/dist
COPY --from=node-builder /app/apps/api/dist ./apps/api/dist

# Copy startup script
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create data directory
RUN mkdir -p /app/data

EXPOSE 8080

CMD ["/app/start.sh"]

