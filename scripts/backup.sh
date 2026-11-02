#!/usr/bin/env bash
# Nightly backup: Postgres dump + uploads/private, copied off-box with rclone. Cron: 30 21 * * *  (02:30 IST = 21:00 UTC)
set -euo pipefail
ROOT=/var/www/genzyclub
DATE=$(date +%F)
DEST=$ROOT/backups/$DATE
REMOTE=${RCLONE_REMOTE:-}   # e.g. gdrive:genzy-backups  (configure with `rclone config`)
mkdir -p "$DEST"
set -a; . "$ROOT/app/.env"; set +a
pg_dump -Fc "$DATABASE_URL" > "$DEST/genzy.dump"
tar -czf "$DEST/files.tgz" -C "$ROOT" uploads private
if [ -n "$REMOTE" ]; then rclone copy "$DEST" "$REMOTE/$DATE"; rclone delete "$REMOTE" --min-age 14d --rmdirs; fi
find "$ROOT/backups" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "backup ok $DATE"
