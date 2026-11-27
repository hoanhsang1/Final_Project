#!/usr/bin/env bash
# Dung cac service native da khoi dong boi run-services.sh
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PIDS="$ROOT/docs/phase-1/e2e/results/pids"
for f in "$PIDS"/*.pid; do
  [ -e "$f" ] || continue
  pid="$(cat "$f")"
  name="$(basename "$f" .pid)"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for i in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -9 "$pid" 2>/dev/null || true
    echo "stopped $name ($pid)"
  else
    echo "not running $name ($pid)"
  fi
  rm -f "$f"
done
