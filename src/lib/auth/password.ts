import 'server-only';
import bcrypt from 'bcryptjs';

// A real hash so a wrong email costs the same time as a wrong password.
let dummy: string | undefined;
const dummyHash = () => (dummy ??= bcrypt.hashSync('not-the-password', 12));

export async function verifyAdminLogin(email: string, password: string): Promise<boolean> {
  const wantEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH ?? '';
  const emailOk = wantEmail !== '' && email.trim().toLowerCase() === wantEmail;
  const passOk = await bcrypt.compare(password, hash || dummyHash()).catch(() => false);
  return emailOk && passOk && hash !== '';
}
