# Build stage
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /build

# Copy go mod files first to leverage docker cache for dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire source (includes vendor directory with patches)
COPY . .

# Ensure the patched xtream library overwrites the downloaded module
COPY patches/go.xtream-codes/flex_types.go /tmp/flex_types.go
RUN for dir in $(go env GOPATH)/pkg/mod/github.com/tellytv/go.xtream-codes@*; do \
      if [ -d "$dir" ]; then \
        cp /tmp/flex_types.go "$dir/flex_types.go"; \
        sed -i 's/,string\"/\"/g' "$dir/structs.go"; \
      fi; \
    done

# Build the application (usa l'architettura della piattaforma di build)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o iptv-proxy .

# Final stage
FROM alpine:3.18

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/iptv-proxy /app/iptv-proxy

# Create directory for iptv files
RUN mkdir -p /root/iptv

# Expose port
EXPOSE 8080

ENTRYPOINT ["/app/iptv-proxy"]
