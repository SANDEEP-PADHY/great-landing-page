import 'server-only';
import { z } from 'zod';

const optional = z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  APP_SECRET: z.string().min(16).default('dev-only-secret-change-me-please'),
  DATABASE_URL: z.string().default('postgres://genzy:genzy@127.0.0.1:5432/genzy'),
  UPLOAD_DIR: z.string().default('./uploads'),
  PRIVATE_DIR: z.string().default('./private'),
  RAZORPAY_KEY_ID: optional,
  RAZORPAY_KEY_SECRET: optional,
  RAZORPAY_WEBHOOK_SECRET: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default('GenZy Club <hello@genzyclub.tech>'),
  EMAIL_REPLY_TO: z.string().default('genzyclub.com@gmail.com'),
  ADMIN_ALERT_EMAIL: z.string().default('genzyclub.com@gmail.com'),
  ADMIN_EMAIL: optional,
  ADMIN_PASSWORD_HASH: optional,
  ADMIN_JWT_SECRET: optional,
  NEXT_PUBLIC_META_PIXEL_ID: optional,
  META_CAPI_ACCESS_TOKEN: optional,
  META_GRAPH_VERSION: z.string().default('v24.0'),
  META_TEST_EVENT_CODE: optional,
  COMMIT_SHA: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;
/** Lazy so `next build` does not need secrets. Throws on malformed values only. */
export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

/** Throws a clear error when a required-at-runtime secret is missing. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const v = env()[key];
  if (v === undefined || v === null || v === '') throw new Error(`Missing env var ${String(key)}`);
  return v as NonNullable<Env[K]>;
}
