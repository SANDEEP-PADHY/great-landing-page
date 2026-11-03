// Usage: pnpm tsx scripts/hash-password.ts 'your password'   [WS3]
import bcrypt from 'bcryptjs';

const pw = process.argv[2];
if (!pw || pw.length < 10) {
  console.error('Usage: pnpm tsx scripts/hash-password.ts "<password of 10+ characters>"');
  process.exit(1);
}
const hash = bcrypt.hashSync(pw, 12);
console.log('\nPaste this line into .env (the backslashes stop Next.js treating $ as a variable):\n');
console.log(`ADMIN_PASSWORD_HASH=${hash.replace(/\$/g, '\\$')}\n`);
