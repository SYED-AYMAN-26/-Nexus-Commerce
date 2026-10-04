#!/usr/bin/env bash
# Start a local MongoDB instance using a data directory inside .data/ .
# Handy for a zero-setup local environment; production deployments should point
# MONGO_URI at a managed cluster instead.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT/.data/mongodb"
LOG_DIR="$ROOT/.data/logs"
PORT="${MONGO_PORT:-27017}"

mkdir -p "$DATA_DIR" "$LOG_DIR"

if pgrep -f "mongod .*--dbpath $DATA_DIR" >/dev/null 2>&1; then
  echo "MongoDB is already running on port $PORT"
  exit 0
fi

if ! command -v mongod >/dev/null 2>&1; then
  echo "mongod was not found on PATH."
  echo "Install MongoDB Community Edition (https://www.mongodb.com/docs/manual/installation/)"
  echo "or set MONGO_URI in .env to a MongoDB Atlas connection string."
  exit 1
fi

mongod --dbpath "$DATA_DIR" --port "$PORT" --bind_ip 127.0.0.1 \
  --logpath "$LOG_DIR/mongod.log" --logappend --fork
echo "MongoDB started on mongodb://127.0.0.1:$PORT (logs: .data/logs/mongod.log)"
