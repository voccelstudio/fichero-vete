#!/usr/bin/env bash
# Lanzador local para macOS / Linux
cd "$(dirname "$0")" || exit 1

if command -v node >/dev/null 2>&1; then
  node server.js 8080
elif command -v python3 >/dev/null 2>&1; then
  ( sleep 2; open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null ) &
  python3 -m http.server 8080
elif command -v python >/dev/null 2>&1; then
  ( sleep 2; xdg-open http://localhost:8080 2>/dev/null ) &
  python -m http.server 8080
else
  echo "Instala Node.js (https://nodejs.org) o Python 3 para ejecutar la app."
fi
