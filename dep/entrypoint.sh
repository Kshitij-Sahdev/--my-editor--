#!/bin/sh
# =============================================================================
# entrypoint.sh — Ensures runner images exist, then starts the Go server
#
# On every container start, this checks if each runner image is present
# on the host Docker daemon (via the mounted socket). If any are missing,
# they're built automatically from the bundled Dockerfiles.
#
# Images persist on the host between deploys — they only rebuild when missing
# (e.g. after a host wipe or `docker image prune`).
# =============================================================================

set -e

RUNNERS_DIR="/app/runners"

build_if_missing() {
  local name="$1"
  local dir="$2"

  if docker image inspect "$name:latest" >/dev/null 2>&1; then
    echo "✓ $name — already exists"
  else
    echo "⏳ $name — building..."
    if docker build -t "$name:latest" "$dir" -q >/dev/null 2>&1; then
      echo "✅ $name — built"
    else
      echo "⚠️  $name — build failed (code execution for this language will error)"
    fi
  fi
}

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  Checking runner images...           ║"
echo "╚══════════════════════════════════════╝"
echo ""

build_if_missing "runner-python" "$RUNNERS_DIR/python"
build_if_missing "runner-js"     "$RUNNERS_DIR/javascript"
build_if_missing "runner-go"     "$RUNNERS_DIR/go"
build_if_missing "runner-cpp"    "$RUNNERS_DIR/cpp"
build_if_missing "runner-java"   "$RUNNERS_DIR/java"

echo ""
echo "══════════════════════════════════════"
echo "Starting server..."
echo ""

exec ./code-runner
