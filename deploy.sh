#!/usr/bin/env bash
# Deploy en el VPS (lo invoca GitHub Actions en cada push a main).
set -euo pipefail
APP="tiendasvirtuales"
PORT="4000"

export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || true

cd "/var/www/${APP}"
git fetch origin main
git reset --hard origin/main

pnpm install --frozen-lockfile || pnpm install
pnpm db:migrate
pnpm build

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

sleep 2
if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "Deploy OK -> https://tiendas.olcas.app"
else
  echo "Healthcheck FALLÓ tras el deploy"
  pm2 logs "${APP}" --lines 30 --nostream || true
  exit 1
fi
