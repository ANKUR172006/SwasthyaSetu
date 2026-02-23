#!/bin/sh
set -eu

API_BASE_URL="${VITE_API_BASE_URL:-}"
PERSIST_SESSION="${VITE_PERSIST_SESSION:-false}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL}",
  PERSIST_SESSION: "${PERSIST_SESSION}"
};
EOF

exec nginx -g 'daemon off;'
