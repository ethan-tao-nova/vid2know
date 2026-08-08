#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp config/.env.example .env
  echo "Created .env from config/.env.example"
fi

if [[ ! -f config/providers.yaml ]]; then
  cp config/providers.example.yaml config/providers.yaml
  echo "Created config/providers.yaml — fill in API keys"
fi

mkdir -p data/notes data/uploads data/cache
docker compose -f deploy/docker-compose.yml up -d --build
echo "Vid2Know is starting. Open http://localhost:8080"
