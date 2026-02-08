#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RUN SCRIPT - AUTOMATED STARTUP
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

BACKEND_PORT=8080
FRONTEND_PORT=5173

BACKEND_PID=""
FRONTEND_PID=""
TUNNEL_PID=""

cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"

    [[ -n "${TUNNEL_PID:-}" ]] && kill $TUNNEL_PID 2>/dev/null || true
    [[ -n "${FRONTEND_PID:-}" ]] && kill $FRONTEND_PID 2>/dev/null || true
    [[ -n "${BACKEND_PID:-}" ]] && kill $BACKEND_PID 2>/dev/null || true

    echo -e "${GREEN}Cleanup complete${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# -----------------------------------------------------------------------------
# Dependency check + auto install
# -----------------------------------------------------------------------------
check_deps() {
    echo -e "${BLUE}Checking dependencies...${NC}"

    command -v go >/dev/null || { echo -e "${RED}Go missing${NC}"; exit 1; }
    command -v node >/dev/null || { echo -e "${RED}Node missing${NC}"; exit 1; }
    command -v npm >/dev/null || { echo -e "${RED}npm missing${NC}"; exit 1; }

    # Install cloudflared automatically if missing
    if ! command -v cloudflared >/dev/null; then
        echo -e "${YELLOW}Installing cloudflared...${NC}"
        curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
        chmod +x /tmp/cloudflared
        sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
    fi

    echo -e "${GREEN}✓ Dependencies OK${NC}"
}

# -----------------------------------------------------------------------------
# Backend
# -----------------------------------------------------------------------------
build_backend() {
    echo -e "${BLUE}Updating Go modules...${NC}"
    cd "$BACKEND_DIR"
    go mod tidy

    echo -e "${BLUE}Building backend binary...${NC}"
    go build -o server .
}

start_backend() {
    echo -e "${BLUE}Starting backend...${NC}"
    cd "$BACKEND_DIR"

    ./server &
    BACKEND_PID=$!

    sleep 2

    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}Backend failed to start${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Backend running (PID $BACKEND_PID)${NC}"
}

# -----------------------------------------------------------------------------
# Frontend
# -----------------------------------------------------------------------------
start_frontend() {
    local mode=$1

    echo -e "${BLUE}Preparing frontend...${NC}"
    cd "$FRONTEND_DIR"

    # Auto install/update deps
    npm install --silent

    if [[ "$mode" == "dev" ]]; then
        echo -e "${BLUE}Starting Vite dev server...${NC}"
        npm run dev -- --host &
    else
        echo -e "${BLUE}Building frontend...${NC}"
        npm run build
        echo -e "${BLUE}Serving production preview...${NC}"
        npm run preview -- --host &
    fi

    FRONTEND_PID=$!
    sleep 3

    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}Frontend failed to start${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Frontend running (PID $FRONTEND_PID)${NC}"
}

# -----------------------------------------------------------------------------
# Tunnel (AUTO URL EXTRACT + HTTP/2)
# -----------------------------------------------------------------------------
start_tunnel() {
    echo -e "${BLUE}Starting Cloudflare HTTP/2 tunnel...${NC}"

    LOGFILE="/tmp/cloudflare_tunnel.log"
    rm -f "$LOGFILE"

    # Start tunnel in background
    cloudflared tunnel \
        --url http://localhost:$FRONTEND_PORT \
        --protocol http2 \
        --no-autoupdate \
        > "$LOGFILE" 2>&1 &

    TUNNEL_PID=$!

    echo -e "${YELLOW}Waiting for public URL...${NC}"

    # Extract URL from logs
    for i in {1..20}; do
        URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' "$LOGFILE" | head -n1 || true)

        if [[ -n "$URL" ]]; then
            echo ""
            echo -e "${GREEN}════════════════════════════════════════════${NC}"
            echo -e "${GREEN}PUBLIC URL (SEND THIS TO PEOPLE):${NC}"
            echo -e "${CYAN}$URL${NC}"
            echo -e "${GREEN}════════════════════════════════════════════${NC}"
            echo ""
            return
        fi

        sleep 1
    done

    echo -e "${RED}Tunnel started but URL not detected${NC}"
}


# -----------------------------------------------------------------------------
print_status() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  SYSTEM ONLINE${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}Frontend:${NC} http://localhost:$FRONTEND_PORT"
    echo -e "${CYAN}Backend:${NC}  http://localhost:$BACKEND_PORT"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to shutdown${NC}"
}

# -----------------------------------------------------------------------------
main() {
    check_deps
    build_backend
    start_backend

    case "${1:-}" in
        dev)
            start_frontend dev
            ;;
        tunnel)
            # Use dev mode for tunnel - it has the /api proxy built in
            start_frontend dev
            start_tunnel
            ;;
        *)
            start_frontend prod
            ;;
    esac

    print_status

    while true; do sleep 1; done
}

main "$@"
