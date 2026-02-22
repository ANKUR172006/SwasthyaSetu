#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"
docker compose up -d

echo "Services are running."
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8080"
