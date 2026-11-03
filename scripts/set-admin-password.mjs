// Usage (on the server, from the app folder): node scripts/set-admin-password.mjs 'your password'
// Hashes the password and writes ADMIN_PASSWORD_HASH (and ADMIN_EMAIL / ADMIN_JWT_SECRET if missing) into .env.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

const pw = process.argv[2];
if (!pw || pw.length < 10) { console.error('Password must be 10+ characters.'); process.exit(1); }
const file = '.env';
let lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [];
const setLine = (key, val, onlyIfMissing = false) => {
  const i = lines.findIndex((l) => l.startsWith(key + '='));
  if (i >= 0) { if (onlyIfMissing && lines[i].split('=')[1]?.trim()) return; lines[i] = `${key}=${val}`; }
  else lines.push(`${key}=${val}`);
};
setLine('ADMIN_PASSWORD_HASH', bcrypt.hashSync(pw, 12).replace(/\$/g, '\\$'));
setLine('ADMIN_EMAIL', 'genzyclub.com@gmail.com', true);
setLine('ADMIN_JWT_SECRET', randomBytes(32).toString('hex'), true);
writeFileSync(file, lines.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });
console.log('Admin password set. Login email:', (lines.find((l) => l.startsWith('ADMIN_EMAIL=')) ?? '').split('=')[1]);
