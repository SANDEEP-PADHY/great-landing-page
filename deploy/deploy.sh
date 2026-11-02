#!/usr/bin/env bash
# Run on the VPS as the deploy user:  BRANCH=main bash deploy/deploy.sh
set -euo pipefail
cd /var/www/genzyclub/app
git fetch origin && git reset --hard "origin/${BRANCH:-main}"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export COMMIT_SHA=$(git rev-parse --short HEAD)
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm build
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 restart genzy-worker
pm2 save
sleep 3
curl -fsS http://127.0.0.1:3000/api/health && echo
