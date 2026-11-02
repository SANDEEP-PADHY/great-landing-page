#!/usr/bin/env bash
# Finishes the genzyclub.tech deploy on a VPS that already runs another site (Docker + Caddy).
# Run as root:  bash deploy/vps-finish.sh
# Safe by design: backs up the Caddyfile, appends only, validates before reload, adds one narrow ufw rule.
set -euo pipefail
APP=/var/www/genzyclub/app
CADDYFILE=/opt/keyline/deploy/Caddyfile
CADDY=deploy-caddy-1
BRANCH=${BRANCH:-claude/project-thread-nfmgsg}
PORT=3100

echo "== 1/5 firewall: let the Caddy container reach port $PORT (internal docker network only)"
SUBNET=$(docker network inspect deploy_default --format '{{(index .IPAM.Config 0).Subnet}}')
ufw allow from "$SUBNET" to any port $PORT proto tcp >/dev/null
echo "   allowed $SUBNET -> $PORT"

echo "== 2/5 app: build and start with PM2 as deploy user"
sudo -u deploy -H bash -lc "cd $APP && BRANCH=$BRANCH bash deploy/deploy.sh"

echo "== 3/5 PM2 restart on reboot"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u deploy --hp /home/deploy >/dev/null 2>&1 || true
sudo -u deploy -H pm2 save >/dev/null

echo "== 4/5 Caddy: add genzyclub.tech (existing sites untouched)"
if grep -q 'genzyclub.tech' "$CADDYFILE"; then
  echo "   already present, skipping"
else
  cp "$CADDYFILE" "$CADDYFILE.bak.$(date +%s)"
  GW=$(docker network inspect deploy_default --format '{{(index .IPAM.Config 0).Gateway}}')
  # append in place (same inode) because the file is a single-file bind mount
  {
    echo
    echo "genzyclub.tech {"
    echo "	encode gzip"
    echo "	reverse_proxy $GW:$PORT"
    echo "}"
    echo
    echo "www.genzyclub.tech {"
    echo "	redir https://genzyclub.tech{uri} permanent"
    echo "}"
  } >> "$CADDYFILE"
  if docker exec $CADDY caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
    docker exec $CADDY caddy reload --config /etc/caddy/Caddyfile
    echo "   caddy reloaded"
  else
    echo "   VALIDATION FAILED, restoring backup"
    cat "$(ls -t $CADDYFILE.bak.* | head -1)" > "$CADDYFILE"
    exit 1
  fi
fi

echo "== 5/5 checks"
curl -fsS http://127.0.0.1:$PORT/api/health && echo
GW=$(docker network inspect deploy_default --format '{{(index .IPAM.Config 0).Gateway}}')
docker exec $CADDY wget -qO- "http://$GW:$PORT/api/health" && echo
echo "DONE. Now point DNS: A genzyclub.tech -> 201.18.206.133 (and CNAME www)."
