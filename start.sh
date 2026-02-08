#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  run() - Code Execution Platform
#  Startup Script v2.0
# =============================================================================

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PORT="${PORT:-8080}"

# Process tracking
PIDS=()

# -----------------------------------------------------------------------------
# Utilities
# -----------------------------------------------------------------------------

log()   { echo "[*] $*"; }
info()  { echo "[+] $*"; }
warn()  { echo "[!] $*"; }
error() { echo "[x] $*" >&2; }
die()   { error "$*"; exit 1; }

cleanup() {
    echo ""
    log "Shutting down..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    log "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Detect environment
detect_env() {
    IS_TERMUX=false
    IS_DOCKER=false
    HAS_DOCKER=false
    
    [[ -d "/data/data/com.termux" ]] && IS_TERMUX=true
    [[ -f "/.dockerenv" ]] && IS_DOCKER=true
    command -v docker &>/dev/null && docker info &>/dev/null 2>&1 && HAS_DOCKER=true
}

# Check required commands
require() {
    for cmd in "$@"; do
        command -v "$cmd" &>/dev/null || die "Required: $cmd"
    done
}

# -----------------------------------------------------------------------------
# Build Functions
# -----------------------------------------------------------------------------

build_frontend() {
    log "Building frontend..."
    cd "$FRONTEND_DIR"
    
    # Ensure clean env for production
    if [[ -f ".env" ]]; then
        sed -i 's|VITE_API_URL=.*|VITE_API_URL=|' .env 2>/dev/null || true
    fi
    
    npm install --silent --no-audit --no-fund 2>/dev/null || npm install
    npm run build
    info "Frontend built"
}

build_backend() {
    log "Building backend..."
    cd "$BACKEND_DIR"
    go mod tidy -e 2>/dev/null || true
    CGO_ENABLED=0 go build -ldflags="-s -w" -o server .
    info "Backend built"
}

# -----------------------------------------------------------------------------
# Run Functions
# -----------------------------------------------------------------------------

start_backend() {
    log "Starting backend on port $PORT..."
    cd "$BACKEND_DIR"
    ./server &
    PIDS+=($!)
    sleep 2
    
    if ! kill -0 "${PIDS[-1]}" 2>/dev/null; then
        die "Backend failed to start"
    fi
    info "Backend running [PID ${PIDS[-1]}]"
}

start_frontend_dev() {
    log "Starting frontend dev server..."
    cd "$FRONTEND_DIR"
    npm install --silent --no-audit --no-fund 2>/dev/null || npm install
    npm run dev -- --host &
    PIDS+=($!)
    sleep 3
    info "Frontend dev server running [PID ${PIDS[-1]}]"
}

start_tunnel() {
    log "Starting tunnel..."
    
    # Install cloudflared if missing
    if ! command -v cloudflared &>/dev/null; then
        warn "Installing cloudflared..."
        if $IS_TERMUX; then
            pkg install cloudflared -y 2>/dev/null || {
                warn "Manual install required for Termux"
                return 1
            }
        else
            curl -sL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" -o /tmp/cloudflared
            chmod +x /tmp/cloudflared
            sudo mv /tmp/cloudflared /usr/local/bin/cloudflared 2>/dev/null || mv /tmp/cloudflared ~/.local/bin/cloudflared
        fi
    fi
    
    # Remove any stale config
    rm -f ~/.cloudflared/config.yml ~/.cloudflared/config.yaml 2>/dev/null || true
    
    local logfile="/tmp/tunnel_$$.log"
    cloudflared tunnel --url "http://localhost:$PORT" --protocol http2 --no-autoupdate >"$logfile" 2>&1 &
    PIDS+=($!)
    
    log "Waiting for tunnel URL..."
    for _ in {1..30}; do
        url=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$logfile" 2>/dev/null | head -1) || true
        if [[ -n "$url" ]]; then
            echo ""
            echo "============================================"
            echo "  PUBLIC URL: $url"
            echo "============================================"
            echo ""
            return 0
        fi
        sleep 1
    done
    
    warn "Tunnel started but URL not detected. Check: $logfile"
}

# -----------------------------------------------------------------------------
# Docker Mode
# -----------------------------------------------------------------------------

run_docker() {
    require docker
    
    log "Building Docker image..."
    
    # Create Dockerfile if not exists
    if [[ ! -f "$SCRIPT_DIR/Dockerfile" ]]; then
        cat > "$SCRIPT_DIR/Dockerfile" << 'DOCKERFILE'
FROM golang:1.22-alpine AS backend-builder
WORKDIR /build
COPY backend/ .
RUN go mod tidy && CGO_ENABLED=0 go build -ldflags="-s -w" -o server .

FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/ .
RUN npm ci --silent && npm run build

FROM alpine:latest
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY --from=backend-builder /build/server .
COPY --from=frontend-builder /build/dist ./frontend/dist
ENV PORT=8080
EXPOSE 8080
CMD ["./server"]
DOCKERFILE
        info "Created Dockerfile"
    fi
    
    docker build -t run-editor "$SCRIPT_DIR"
    
    log "Starting container..."
    docker run -d --rm \
        --name run-editor \
        -p "${PORT}:8080" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        run-editor
    
    info "Container running on http://localhost:$PORT"
    info "Stop with: docker stop run-editor"
}

# -----------------------------------------------------------------------------
# Status Display
# -----------------------------------------------------------------------------

show_status() {
    echo ""
    echo "============================================"
    echo "  SYSTEM ONLINE"
    echo "============================================"
    echo "  Backend:  http://localhost:$PORT"
    echo "  Health:   http://localhost:$PORT/api/health"
    echo "============================================"
    echo "  Press Ctrl+C to stop"
    echo ""
}

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: ./start.sh [mode]

Modes:
  dev       Development mode (Vite hot-reload + backend)
  tunnel    Production build + Cloudflare tunnel
  docker    Build and run in Docker container
  build     Build only (no server start)
  (none)    Production build + local server

Environment:
  PORT      Server port (default: 8080)

Examples:
  ./start.sh              # Build and run locally
  ./start.sh dev          # Development with hot-reload
  ./start.sh tunnel       # Share via public URL
  PORT=3000 ./start.sh    # Run on custom port
EOF
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    detect_env
    
    # Header
    echo ""
    echo "run() - Code Execution Platform"
    echo "--------------------------------"
    $IS_TERMUX && log "Environment: Termux"
    $IS_DOCKER && log "Environment: Docker"
    $HAS_DOCKER && log "Docker: Available" || log "Docker: Not available"
    echo ""
    
    case "${1:-}" in
        -h|--help|help)
            show_help
            exit 0
            ;;
        dev)
            require go node npm
            build_backend
            start_backend
            start_frontend_dev
            show_status
            ;;
        tunnel)
            require go node npm
            build_frontend
            build_backend
            start_backend
            start_tunnel
            show_status
            ;;
        docker)
            run_docker
            exit 0
            ;;
        build)
            require go node npm
            build_frontend
            build_backend
            info "Build complete"
            exit 0
            ;;
        *)
            require go node npm
            build_frontend
            build_backend
            start_backend
            show_status
            ;;
    esac
    
    # Keep alive
    while true; do sleep 60; done
}

main "$@"
