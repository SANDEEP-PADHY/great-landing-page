#!/usr/bin/env bash
# Regenerates /etc/nginx/cloudflare-ips.conf from Cloudflare's published ranges. Run as root, then `nginx -s reload`.
set -euo pipefail
out=/etc/nginx/cloudflare-ips.conf
: > $out
for u in https://www.cloudflare.com/ips-v4 https://www.cloudflare.com/ips-v6; do
  curl -fsS $u | while read -r ip; do [ -n "$ip" ] && echo "set_real_ip_from $ip;" >> $out; done
done
