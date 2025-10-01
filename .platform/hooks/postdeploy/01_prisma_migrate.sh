#!/bin/bash
set -euo pipefail

cd /var/app/staging

if [ -f package.json ]; then
  echo "[postdeploy] Installing production dependencies"
  npm ci --omit=dev
fi

echo "[postdeploy] Running Prisma migrations"
npx prisma migrate deploy

echo "[postdeploy] Postdeploy hook completed"
