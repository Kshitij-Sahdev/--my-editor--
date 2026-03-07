#!/usr/bin/env bash
# =============================================================================
# build-runners.sh
#
# Builds all language sandbox images that the Go server spawns at runtime.
# Run this ONCE on the Docker host before deploying, and again whenever
# you update a runner Dockerfile.
#
# Usage:
#   chmod +x build-runners.sh
#   ./build-runners.sh           # build all runners
#   ./build-runners.sh python    # build only the python runner
# =============================================================================

set -euo pipefail

RUNNERS_DIR="$(cd "$(dirname "$0")/runners" && pwd)"

declare -A RUNNERS=(
  ["python"]="Dockerfile.python"
  ["javascript"]="Dockerfile.javascript"
  ["go"]="Dockerfile.go"
  ["cpp"]="Dockerfile.cpp"
  ["java"]="Dockerfile.java"
)

# If an argument is provided, build only that runner
if [[ $# -gt 0 ]]; then
  TARGET="$1"
  if [[ -z "${RUNNERS[$TARGET]+_}" ]]; then
    echo "❌ Unknown runner: $TARGET"
    echo "   Available: ${!RUNNERS[*]}"
    exit 1
  fi
  RUNNERS=( ["$TARGET"]="${RUNNERS[$TARGET]}" )
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       Code Runner — Build Images     ║"
echo "╚══════════════════════════════════════╝"
echo ""

FAILED=()

for LANG in "${!RUNNERS[@]}"; do
  DOCKERFILE="${RUNNERS[$LANG]}"
  # Map language names to image names (must match Go backend's LangConfig)
  case "$LANG" in
    javascript) IMAGE="runner-js" ;;
    *)          IMAGE="runner-${LANG}" ;;
  esac
  FILEPATH="${RUNNERS_DIR}/${DOCKERFILE}"

  if [[ ! -f "$FILEPATH" ]]; then
    echo "⚠️  Skipping $LANG — $FILEPATH not found"
    continue
  fi

  echo "🔨 Building $IMAGE from $DOCKERFILE..."

  if docker build \
    --file "$FILEPATH" \
    --tag "$IMAGE" \
    --label "code-runner=true" \
    --label "language=$LANG" \
    "$RUNNERS_DIR"; then
    echo "✅ $IMAGE built successfully"
  else
    echo "❌ Failed to build $IMAGE"
    FAILED+=("$IMAGE")
  fi
  echo ""
done

# Summary
echo "══════════════════════════════════════"
if [[ ${#FAILED[@]} -eq 0 ]]; then
  echo "✅ All runner images built successfully!"
  echo ""
  echo "Installed images:"
  docker images --filter "label=code-runner=true" --format "  • {{.Repository}}:{{.Tag}}  ({{.Size}})"
else
  echo "❌ Failed images: ${FAILED[*]}"
  echo "   Check the output above for errors."
  exit 1
fi
echo ""
