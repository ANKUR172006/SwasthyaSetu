#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "[1/6] Checking Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH."
  exit 1
fi

echo "[2/6] Ensuring env files..."
[[ -f "$BACKEND_DIR/.env" ]] || cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
[[ -f "$FRONTEND_DIR/.env" ]] || cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"

echo "[3/6] Building and starting services..."
cd "$BACKEND_DIR"
docker compose up -d --build

echo "[4/6] Running database migration..."
docker compose exec -T backend npx prisma db push

echo "[5/6] Seeding pilot data..."
docker compose exec -T backend npm run prisma:seed

echo "[6/6] Done."
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:8080"
echo "AI:        http://localhost:8000/health"
echo "Postgres:  localhost:5432"
echo "Redis:     localhost:6379"
