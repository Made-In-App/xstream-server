FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go module files
COPY go.mod go.sum ./

# Copy source code
COPY main.go ./

# Ensure module dependencies and sums are up to date
RUN go mod tidy

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o stream-relay .

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/stream-relay .

EXPOSE 8090

CMD ["./stream-relay"]

