#!/usr/bin/env bash
# Start both backend and frontend dev servers
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting Red Devils Chat development servers..."

# Start backend
cd "$ROOT_DIR/server"
echo "→ Backend starting on port ${PORT:-3000}..."
npx tsx src/server.ts | npx pino-pretty &
BACKEND_PID=$!

# Start frontend
cd "$ROOT_DIR/frontend"
echo "→ Frontend starting..."
npx vite &
FRONTEND_PID=$!

# Trap Ctrl+C to kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

echo "✓ Both servers running. Press Ctrl+C to stop."
wait
