#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo "[*] $*"; }
info() { echo "[+] $*"; }
warn() { echo "[!] $*"; }

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

docker_ready() {
  has_cmd docker && docker info >/dev/null 2>&1
}

ensure_env_key() {
  local key="$1"
  local value="${2:-}"
  local env_file="$ROOT_DIR/frontend/.env"

  [[ -n "$value" ]] || return 0

  mkdir -p "$(dirname "$env_file")"
  touch "$env_file"

  if grep -q "^${key}=" "$env_file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$env_file"
  else
    printf "%s=%s\n" "$key" "$value" >> "$env_file"
  fi
}

build_runner_if_missing() {
  local image="$1"
  local dockerfile="$2"
  local context="$3"

  if docker image inspect "${image}:latest" >/dev/null 2>&1; then
    info "${image}:latest present"
    return 0
  fi

  if [[ ! -f "$dockerfile" ]]; then
    warn "Cannot build ${image}: missing ${dockerfile}"
    return 1
  fi

  if [[ ! -d "$context" ]]; then
    warn "Cannot build ${image}: missing context ${context}"
    return 1
  fi

  log "Building ${image}:latest"
  if docker build -f "$dockerfile" -t "${image}:latest" "$context"; then
    info "Built ${image}:latest"
    return 0
  fi

  warn "Build failed for ${image}:latest"
  return 1
}

main() {
  log "Running self-heal checks"

  local clerk_key="${VITE_CLERK_PUBLISHABLE_KEY:-${CLERK_PUBLISHABLE_KEY:-}}"
  local clerk_proxy="${VITE_CLERK_PROXY_URL:-${CLERK_PROXY_URL:-}}"

  if [[ -n "$clerk_key" ]]; then
    ensure_env_key "VITE_CLERK_PUBLISHABLE_KEY" "$clerk_key"
    [[ -n "$clerk_proxy" ]] && ensure_env_key "VITE_CLERK_PROXY_URL" "$clerk_proxy"
    info "Frontend Clerk env synchronized to frontend/.env"
  else
    warn "Clerk key missing. Set VITE_CLERK_PUBLISHABLE_KEY (or CLERK_PUBLISHABLE_KEY)."
  fi

  if ! docker_ready; then
    warn "Docker is not available; skipping runner image self-heal"
    exit 0
  fi

  local failed=0

  build_runner_if_missing "runner-python" "$ROOT_DIR/dep/runners/Dockerfile.python" "$ROOT_DIR/dep/runners" || failed=1
  build_runner_if_missing "runner-js" "$ROOT_DIR/dep/runners/Dockerfile.javascript" "$ROOT_DIR/dep/runners" || failed=1
  build_runner_if_missing "runner-go" "$ROOT_DIR/dep/runners/Dockerfile.go" "$ROOT_DIR/dep/runners" || failed=1
  build_runner_if_missing "runner-cpp" "$ROOT_DIR/dep/runners/Dockerfile.cpp" "$ROOT_DIR/dep/runners" || failed=1
  build_runner_if_missing "runner-java" "$ROOT_DIR/dep/runners/Dockerfile.java" "$ROOT_DIR/dep/runners" || failed=1

  if [[ "$failed" -eq 0 ]]; then
    info "Self-heal complete"
  else
    warn "Self-heal finished with failures"
  fi
}

main "$@"
