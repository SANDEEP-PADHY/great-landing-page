# 08: Hosting and Deploy — Hostinger KVM 1 on genzyclub.tech

Owner: **WS1**. Files live in `deploy/`.

## Box
Hostinger KVM 1: 1 vCPU, 4 GB RAM, 50 GB NVMe. Ubuntu 24.04 LTS.

```
Internet → Cloudflare (proxy, SSL Full strict, cache static) → VPS :443 Nginx
            ├─ /uploads/*   → files from /var/www/genzyclub/uploads (immutable cache)
            ├─ /_next/static → proxied, Cache-Control immutable
            └─ everything else → 127.0.0.1:3000 (PM2 genzy-web, next start)
PM2 genzy-worker (tsx scripts/worker.ts): CAPI outbox, email retries, abandoned emails, auto reminders
PostgreSQL 16 on 127.0.0.1:5432 only
```

## One-time setup (`deploy/setup-vps.md`, step by step for the owner or a build thread)
1. **Users and SSH:** create `deploy` user with sudo, add SSH key, `PasswordAuthentication no`, `PermitRootLogin no`.
2. **Firewall:** `ufw allow 22,80,443/tcp && ufw enable`. Optional: restrict 80/443 to Cloudflare IP ranges.
3. **Swap:** 2 GB swapfile (Next.js build needs it on 4 GB).
4. **Packages:** Node 22 (NodeSource), `corepack enable` (pnpm), `pm2` global, `nginx`, `postgresql-16`, `fail2ban`, `unattended-upgrades`.
5. **Postgres:** user `genzy`, DB `genzy`, strong password, `listen_addresses='localhost'`.
6. **Folders:** `/var/www/genzyclub/{app,uploads,private,backups}` owned by `deploy`.
7. **App:** `git clone` into `app`, create `.env` (see `01-stack-and-structure.md`), `pnpm install --frozen-lockfile`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm build`, `pm2 start deploy/ecosystem.config.cjs`, `pm2 save`, `pm2 startup`, `pm2 install pm2-logrotate`.
8. **DNS (Cloudflare):** `A genzyclub.tech → VPS IP` (proxied), `CNAME www → genzyclub.tech` (proxied, redirect www → apex in Nginx). Resend and Meta TXT/CNAME records as DNS only.
9. **TLS:** Cloudflare Origin Certificate (15 years) installed in Nginx; Cloudflare SSL mode **Full (strict)**; "Always use HTTPS" on.
10. **Cloudflare rules:** WAF custom rule **skip** (all managed rules, Bot Fight Mode, Super Bot Fight) for `URI Path equals /api/webhooks/razorpay`; Rocket Loader **off** (breaks Razorpay/Pixel scripts); cache rule: bypass for `/api/*` and `/admin/*`.

## Nginx (`deploy/nginx.conf`)
Key parts:
```nginx
# real client IP from Cloudflare (list of CF ranges in /etc/nginx/cloudflare-ips.conf)
include /etc/nginx/cloudflare-ips.conf;   # set_real_ip_from …;
real_ip_header CF-Connecting-IP;

server {
  listen 443 ssl http2;
  server_name genzyclub.tech;
  ssl_certificate     /etc/ssl/cloudflare/genzyclub.pem;
  ssl_certificate_key /etc/ssl/cloudflare/genzyclub.key;
  client_max_body_size 30m;               # template file upload

  gzip on; gzip_types text/css application/javascript application/json image/svg+xml;

  location /uploads/ {
    alias /var/www/genzyclub/uploads/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }
  location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
    proxy_set_header CF-IPCountry $http_cf_ipcountry;
  }
}
server { listen 80; server_name genzyclub.tech www.genzyclub.tech; return 301 https://genzyclub.tech$request_uri; }
server { listen 443 ssl http2; server_name www.genzyclub.tech; ssl_certificate …; return 301 https://genzyclub.tech$request_uri; }
```
Rate-limit `/admin/login` and `/api/checkout/order` with `limit_req_zone` (10 r/m per IP) as a second layer.

## PM2 (`deploy/ecosystem.config.cjs`)
```js
module.exports = { apps: [
  { name: 'genzy-web', cwd: '/var/www/genzyclub/app', script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000 -H 127.0.0.1', instances: 1, exec_mode: 'fork', max_memory_restart: '900M',
    env: { NODE_ENV: 'production' } },
  { name: 'genzy-worker', cwd: '/var/www/genzyclub/app', script: 'node_modules/.bin/tsx',
    args: 'scripts/worker.ts', instances: 1, exec_mode: 'fork', max_memory_restart: '300M',
    env: { NODE_ENV: 'production' } },
]};
```
Next loads `.env` itself; the worker loads it with `dotenv/config` at the top of `scripts/worker.ts`.

## Worker (`scripts/worker.ts`, WS1 owns the runner)
A tiny loop: `register(name, everyMs, fn)`; each job runs with an overlap guard and try/catch, logs duration. Jobs:
| Job | Every | Owner |
|---|---|---|
| `capi-outbox` | 5 s | WS4 (`registerCapiJob`) |
| `email-retry` | 2 min | WS1 |
| `abandoned-emails` | 5 min | WS1 |
| `auto-reminders` | 1 min | WS1 (only if setting on) |
Graceful shutdown on SIGINT/SIGTERM.

## Deploy (`deploy/deploy.sh`, run on the VPS)
```bash
set -euo pipefail
cd /var/www/genzyclub/app
git fetch origin && git reset --hard origin/${BRANCH:-main}
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pm2 reload genzy-web && pm2 restart genzy-worker
curl -fsS https://genzyclub.tech/api/health
```
`/api/health` returns `{ ok: true, db: true, commit }` after a `SELECT 1`.

## Backups (`scripts/backup.sh`, cron 02:30 IST daily)
`pg_dump -Fc genzy` + `tar` of `uploads/` and `private/` → `/var/www/genzyclub/backups/<date>` → `rclone copy` to an off-box remote (Google Drive or Cloudflare R2; owner picks, credentials in `rclone.conf`) → keep 14 days locally and remotely. Test one restore before launch.

## Monitoring
- UptimeRobot (free): `https://genzyclub.tech/` and `/api/health` every 5 min, alerts to the owner's email/phone.
- `pm2 logs`, `pm2-logrotate` (10 MB × 7).
- Admin Tracking page shows CAPI failures; Emails page shows email failures.

## Package scripts (in `package.json`)
`dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `db:generate` (drizzle-kit generate), `db:migrate` (drizzle-kit migrate), `db:seed` (`tsx scripts/seed.ts`), `worker` (`tsx scripts/worker.ts`).
