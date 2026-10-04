#!/usr/bin/env bash
# Stop the MongoDB instance started by scripts/mongo-start.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT/.data/mongodb"
if pgrep -f "mongod .*--dbpath $DATA_DIR" >/dev/null 2>&1; then
  pkill -f "mongod .*--dbpath $DATA_DIR" && echo "MongoDB stopped"
else
  echo "No local MongoDB instance is running"
fi
