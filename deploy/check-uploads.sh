#!/usr/bin/env bash
# Diagnoses admin-uploaded images. Run on the VPS as the deploy user:  bash deploy/check-uploads.sh
cd /var/www/genzyclub/app
val() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
DIR=$(realpath -m "$(val UPLOAD_DIR)")
[ "$DIR" = "$(pwd)" ] && DIR=$(realpath -m ./uploads)
echo "== commit: $(git rev-parse --short HEAD) on $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo "== route present: $([ -f 'src/app/uploads/[file]/route.ts' ] && echo yes || echo NO)"
echo "== upload dir: $DIR"
ls -la "$DIR" 2>&1 | head -25
echo "== media rows in database"
if command -v psql >/dev/null; then
  psql "$(val DATABASE_URL)" -At -c "select key || '  ' || path from media order by key" 2>&1 | head -20
else
  echo "(psql not installed, skipped)"
fi
F=$(ls "$DIR" 2>/dev/null | grep -E '\.(webp|jpg|png)$' | head -1)
if [ -n "$F" ]; then
  curl -sS -o /dev/null -w "== app    /uploads/$F -> HTTP %{http_code}\n" "http://127.0.0.1:3100/uploads/$F"
  curl -sS -o /dev/null -w "== public /uploads/$F -> HTTP %{http_code}\n" "https://genzyclub.tech/uploads/$F"
else
  echo "== no image files found in the upload dir"
fi
echo "== recent app errors"
pm2 logs genzy-web --lines 200 --nostream 2>/dev/null | grep -iE 'media|upload|EACCES|ENOENT' | tail -10
