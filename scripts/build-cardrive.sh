#!/bin/bash
#
# Rebuild the CarDrive pygbag web bundle and copy it into public/games/cardrive/
# so the React app serves the latest version.
#
# Usage:  ./scripts/build-cardrive.sh
#
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GAME_SRC="$ROOT/games/cardrive"
PUBLIC_DIR="$ROOT/public/games/cardrive"
CDN="https://pygame-web.github.io/archives/0.9/"

echo "==> Building CarDrive with pygbag..."
cd "$GAME_SRC"

# Use the game's own venv if present, else system python
PY="venv/bin/python"
[ -x "$PY" ] || PY="python3"

"$PY" -m pygbag --cdn "$CDN" --build main.py

echo "==> Copying build → public/games/cardrive/"
rm -rf "$PUBLIC_DIR"
mkdir -p "$PUBLIC_DIR"
cp -r "$GAME_SRC/build/web/." "$PUBLIC_DIR/"

echo "==> Done. Run 'npm run dev' and open http://localhost:5173/"
