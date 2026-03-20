#!/usr/bin/env bash
# Start the backend server (used by test scripts)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR/server"
exec npx tsx src/server.ts
