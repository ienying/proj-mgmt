#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  up        Build and start the app (docker compose up -d)
  down      Stop the app
  logs      Follow app logs
  rebuild   Rebuild the image and restart
  shell     Open a shell inside the app container
  status    Show container status
  clean     Stop containers and remove volumes/images

Environment:
  Copy .env.docker to .env and fill in your Supabase credentials first:
    cp .env.docker .env
    # edit .env with your values

EOF
}

case "${1:-}" in
  up)
    echo "==> Building and starting app..."
    docker compose --env-file .env up -d --build
    echo "==> App running at http://localhost:${PORT:-5000}"
    ;;
  down)
    docker compose down
    ;;
  logs)
    docker compose logs -f app
    ;;
  rebuild)
    echo "==> Rebuilding and restarting..."
    docker compose build --no-cache
    docker compose --env-file .env up -d
    ;;
  shell)
    docker compose exec app bash
    ;;
  status)
    docker compose ps
    ;;
  clean)
    docker compose down -v --rmi local
    ;;
  *)
    usage
    exit 1
    ;;
esac