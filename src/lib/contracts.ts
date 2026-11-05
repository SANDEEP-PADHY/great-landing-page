import { z } from 'zod';

export type SlotId = string;

export const MEDIA_KEYS = [
  'hero', 'proof', 'host', 'bonus_template_cover',
  'og_image', 'logo', 'favicon', 'bonus_template_file',
] as const;
export type MediaKey = (typeof MEDIA_KEYS)[number];

export type Settings = {
  whatsapp_link: string;
  contact_email: string;
  contact_phone: string;
  offer_price_paise: number;
  regular_price_paise: number;
  offer_ends_at: string; // ISO with +05:30
  sales_open: boolean;
  bonus_value: string; // optional '₹999' shown as "worth ₹999" next to the template bonus
  email_abandoned_enabled: boolean;
  email_abandoned_delay_min: number;
  email_admin_alert_enabled: boolean;
  email_auto_reminder_enabled: boolean;
  capi_test_event_code: string;
};
export type SettingKey = keyof Settings;
export type PublicSettings = Pick<
  Settings,
  | 'whatsapp_link' | 'contact_email' | 'contact_phone' | 'offer_price_paise'
  | 'regular_price_paise' | 'offer_ends_at' | 'sales_open' | 'bonus_value'
>;

export type SlotView = {
  id: SlotId; dayLabel: string; dateLabel: string; startsAt: string; endsAt: string; isOpen: boolean;
};
export type PriceView = { pricePaise: number; regularPaise: number; offerEndsAt: string; isOffer: boolean };
export type MediaView = {
  key: MediaKey; src: string; srcset?: { w: number; src: string }[]; width?: number; height?: number; alt?: string;
};
export type MediaMap = Partial<Record<MediaKey, MediaView>>;

export const CreateOrderRequest = z.object({
  slotId: z.string().min(1).max(40),
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().trim().toLowerCase().email().max(120),
  leadEventId: z.string().uuid(),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequest>;

export type CreateOrderResponse = {
  publicId: string; razorpayOrderId: string; amount: number; currency: 'INR'; keyId: string;
  prefill: { name: string; email: string; contact: string }; description: string;
};
export const VerifyRequest = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});
export type VerifyRequest = z.infer<typeof VerifyRequest>;
export type VerifyResponse = { ok: true; redirect: string };
export type StatusResponse = {
  status: 'pending' | 'paid' | 'failed'; slot: { dayLabel: string; dateLabel: string };
};
export type ApiError = {
  error: 'validation' | 'slot_closed' | 'sales_closed' | 'rate_limited' | 'payment_provider' | 'bad_signature' | 'not_found';
  fields?: Record<string, string>;
};

export type OrderReceipt = {
  orderId: string; publicId: string; status: 'pending' | 'paid' | 'failed' | 'expired';
  amountPaise: number; paymentId: string | null; method: string | null; paidAt: string | null; createdAt: string;
  customer: { name: string; email: string; phone: string };
  slot: SlotView;
};

export type DateRange = { from: Date; to: Date };
