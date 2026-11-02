import 'server-only';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireEnv } from './env';

let client: Razorpay | undefined;
export function razorpay(): Razorpay {
  client ??= new Razorpay({ key_id: requireEnv('RAZORPAY_KEY_ID'), key_secret: requireEnv('RAZORPAY_KEY_SECRET') });
  return client;
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac('sha256', requireEnv('RAZORPAY_KEY_SECRET')).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', requireEnv('RAZORPAY_WEBHOOK_SECRET')).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
