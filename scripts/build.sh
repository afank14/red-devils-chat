#!/usr/bin/env bash
# Build frontend and type-check server
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Building Red Devils Chat ==="

# Type-check server
echo "→ Type-checking server..."
cd "$ROOT_DIR/server"
npx tsc --noEmit
echo "  ✓ Server types OK"

# Build frontend
echo "→ Building frontend..."
cd "$ROOT_DIR/frontend"
npx vite build
echo "  ✓ Frontend built"

echo "=== Build complete ==="
