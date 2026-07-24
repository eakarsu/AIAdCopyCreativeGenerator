#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

if [[ ! -f .env ]]; then
  echo "Missing .env; copy .env.example and configure it." >&2
  exit 1
fi
set -a
source .env
set +a

export RUNTIME_PROJECT_NAME="AI Ad Copy Creative Generator"
export RUNTIME_AI_ENDPOINT="/api/ai/ad-creative-review"
export RUNTIME_AI_FEATURE="ad-creative-governance-review"
export RUNTIME_AI_SYSTEM_PROMPT="Review advertising copy for audience fit, claim substantiation, brand alignment, channel constraints, and approval risks."

if [[ ! -d backend/node_modules || ! -d frontend/node_modules ]]; then
  echo "Dependencies are missing; run ./scripts/bootstrap.sh explicitly." >&2
  exit 1
fi

for port in "${BACKEND_PORT:-3001}" "${FRONTEND_PORT:-3000}"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is occupied; refusing to terminate another process." >&2
    exit 1
  fi
done

(cd backend && npm start) &
backend_pid=$!
(cd frontend && npm run dev -- --port "${FRONTEND_PORT:-3000}" --host 127.0.0.1) &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
cleanup
set +e
wait "$backend_pid"; backend_status=$?
wait "$frontend_pid"; frontend_status=$?
set -e
if (( backend_status != 0 || frontend_status != 0 )); then
  echo "A child service exited unexpectedly (backend=$backend_status frontend=$frontend_status)." >&2
  exit 1
fi
