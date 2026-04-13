#!/usr/bin/env sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
ENV_FILE=${MVIEW_ENV_FILE:-"$ROOT_DIR/deploy/public/.env"}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Copy deploy/public/.env.example to deploy/public/.env or set MVIEW_ENV_FILE." >&2
  exit 1
fi

cd "$ROOT_DIR"
exec docker compose -p mobile-viewer-public --env-file "$ENV_FILE" -f deploy/public/compose.yaml up --build "$@"
