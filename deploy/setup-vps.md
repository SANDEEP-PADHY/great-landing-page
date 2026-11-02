# VPS setup: Hostinger KVM 1 (Ubuntu 24.04) for genzyclub.tech

Run as root first, then as the `deploy` user where noted. Replace `<...>` values.

## 1. Users and SSH
```bash
adduser deploy && usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/ && chown -R deploy:deploy /home/deploy/.ssh
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh
```
Check you can log in as `deploy` in a second terminal before closing the root session.

## 2. Firewall, swap, packages
```bash
ufw allow 22,80,443/tcp && ufw --force enable
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt update && apt install -y nodejs nginx postgresql postgresql-contrib fail2ban unattended-upgrades git rclone
corepack enable && npm i -g pm2
```
(Ubuntu 24.04 ships PostgreSQL 16.)

## 3. Postgres (local only)
```bash
sudo -u postgres psql -c "CREATE USER genzy WITH PASSWORD '<strong-password>';"
sudo -u postgres psql -c "CREATE DATABASE genzy OWNER genzy;"
```
Keep `listen_addresses = 'localhost'` (default).

## 4. Folders
```bash
mkdir -p /var/www/genzyclub/{app,uploads,private,backups} && chown -R deploy:deploy /var/www/genzyclub
```

## 5. App (as `deploy`)
```bash
cd /var/www/genzyclub && git clone https://github.com/SANDEEP-PADHY/great-landing-page.git app && cd app
git checkout <branch>
cp .env.example .env && nano .env      # fill every value; APP_SECRET and ADMIN_JWT_SECRET: openssl rand -hex 32
BRANCH=<branch> bash deploy/deploy.sh   # install, migrate, seed, build, start PM2
pm2 startup systemd -u deploy --hp /home/deploy   # run the printed sudo command
pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 10M && pm2 set pm2-logrotate:retain 7
```

## 6. Nginx and TLS
1. Cloudflare dashboard → SSL/TLS → Origin Server → create certificate for `genzyclub.tech, *.genzyclub.tech`. Save as `/etc/ssl/cloudflare/genzyclub.pem` and `.key` (chmod 600 the key).
2. ```bash
   sudo bash deploy/cloudflare-ips.sh
   sudo cp deploy/genzy-proxy.conf /etc/nginx/snippets/
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/genzyclub.conf
   sudo ln -sf /etc/nginx/sites-available/genzyclub.conf /etc/nginx/sites-enabled/ && sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. Cloudflare SSL mode **Full (strict)**, "Always use HTTPS" on.

## 7. Cloudflare DNS and rules
- `A genzyclub.tech → <VPS IP>` (proxied); `CNAME www → genzyclub.tech` (proxied).
- Resend and Meta records: **DNS only** (grey cloud).
- WAF custom rule: skip all managed rules and Bot Fight Mode where URI path equals `/api/webhooks/razorpay`.
- Rocket Loader **off**. Cache rule: bypass cache for `/api/*` and `/admin/*`.

## 8. Razorpay and Resend
- Razorpay Dashboard → Webhooks → `https://genzyclub.tech/api/webhooks/razorpay`, events `payment.captured`, `payment.failed`, `order.paid`; put the secret in `RAZORPAY_WEBHOOK_SECRET`. Settings → Payment capture: automatic.
- Resend → add domain `genzyclub.tech`, paste the SPF/DKIM/return-path records into Cloudflare (DNS only). Add `_dmarc TXT "v=DMARC1; p=none; rua=mailto:genzyclub.com@gmail.com"`.

## 9. Backups and monitoring
```bash
crontab -e   # as deploy:  30 21 * * * RCLONE_REMOTE=<remote:path> /var/www/genzyclub/app/scripts/backup.sh >> /var/www/genzyclub/backups/backup.log 2>&1
```
Run `rclone config` once. Test one restore: `createdb genzy_restore && pg_restore -d genzy_restore backups/<date>/genzy.dump`.
UptimeRobot: monitor `https://genzyclub.tech/` and `/api/health` every 5 minutes.

## Switching Razorpay to live
Change `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET` in `.env`, add the webhook in live mode, then `pm2 reload genzy-web genzy-worker --update-env`.
