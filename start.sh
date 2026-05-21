#!/usr/bin/env bash
# ─────────────────────────────────────────────
# DamageAI — one-command launcher
# Usage: ./start.sh
# Starts backend (:8000) + frontend (:5173)
# Press Ctrl+C to shut both down cleanly.
# ─────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
VENV="$BACKEND/.venv"

# ── 1. Check .env ─────────────────────────────
if [[ ! -f "$BACKEND/.env" ]]; then
  echo "⚠  No .env found — copying from .env.example"
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "   Edit $BACKEND/.env and set AI_API_KEY, then re-run."
  exit 1
fi

# ── 2. Python venv ────────────────────────────
if [[ ! -d "$VENV" ]]; then
  echo "🐍 Creating Python virtual environment…"
  python3 -m venv "$VENV"
fi

echo "📦 Installing Python dependencies…"
"$VENV/bin/pip" install -q -r "$BACKEND/requirements.txt"

# ── 3. Node deps ──────────────────────────────
if [[ ! -d "$FRONTEND/node_modules" ]]; then
  echo "📦 Installing frontend dependencies…"
  cd "$FRONTEND" && npm install --silent && cd "$ROOT"
fi

# ── 4. Start backend ──────────────────────────
echo ""
echo "🚀 Starting backend  → http://localhost:8000"
echo "🚀 Starting frontend → http://localhost:5173"
echo "   Press Ctrl+C to stop both."
echo ""

cd "$BACKEND"
"$VENV/bin/uvicorn" app.main:app --port 8000 --reload &
BACKEND_PID=$!

# ── 5. Start frontend (foreground) ────────────
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!

# ── 6. Clean shutdown on Ctrl+C ───────────────
cleanup() {
  echo ""
  echo "Shutting down…"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup SIGINT SIGTERM

wait "$FRONTEND_PID"
