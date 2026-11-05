// src/lib/db/schema.ts
import {
  pgTable, pgEnum, text, uuid, integer, boolean, timestamp, jsonb, bigserial, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum('order_status', ['pending', 'paid', 'failed', 'expired']);
export const outboxStatus = pgEnum('outbox_status', ['pending', 'sent', 'failed']);
export const emailStatus = pgEnum('email_status', ['queued', 'sent', 'failed']);

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const slots = pgTable('slots', {
  id: text('id').primaryKey(),                       // 's7' for seeded slots; admin-created slots get 's' + random hex
  dayLabel: text('day_label').notNull(),             // 'Sat'
  dateLabel: text('date_label').notNull(),           // '7 Nov'
  startsAt: ts('starts_at').notNull(),               // 2026-11-07T13:30:00Z (7 PM IST)
  endsAt: ts('ends_at').notNull(),                   // 9 PM IST
  isOpen: boolean('is_open').notNull().default(true),// manual override; also closes automatically at startsAt
  webinarUrl: text('webinar_url'),                   // webinar.gg link, set in admin
  sort: integer('sort').notNull().default(0),
  capacity: integer('capacity'),                     // max paid seats; null = unlimited
  archivedAt: ts('archived_at'),                     // set instead of deleting when orders exist; hidden from the public site
});

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),                    // E.164 +91XXXXXXXXXX
  email: text('email').notNull(),                    // lowercased
  visitorId: text('visitor_id'),                     // last visitor cookie seen at checkout
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('customers_phone_uq').on(t.phone), index('customers_email_idx').on(t.email)]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicId: text('public_id').notNull(),             // 'GZ-7K3P9Q' shown to buyer
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  slotId: text('slot_id').notNull().references(() => slots.id),
  amountPaise: integer('amount_paise').notNull(),
  currency: text('currency').notNull().default('INR'),
  status: orderStatus('status').notNull().default('pending'),
  razorpayOrderId: text('razorpay_order_id').notNull(),
  razorpayPaymentId: text('razorpay_payment_id'),
  paymentMethod: text('payment_method'),             // upi | card | netbanking | wallet
  lastFailureReason: text('last_failure_reason'),
  // attribution snapshot at checkout (copied from cookies / visitors row)
  visitorId: text('visitor_id'),
  utmSource: text('utm_source'), utmMedium: text('utm_medium'), utmCampaign: text('utm_campaign'),
  utmContent: text('utm_content'), utmTerm: text('utm_term'),
  fbclid: text('fbclid'), fbc: text('fbc'), fbp: text('fbp'),
  landingUrl: text('landing_url'), referrer: text('referrer'),
  ip: text('ip'), userAgent: text('user_agent'),
  leadEventId: text('lead_event_id'),                // event_id of the Lead event (dedup)
  // fulfilment
  paidAt: ts('paid_at'),
  confirmationSentAt: ts('confirmation_sent_at'),
  abandonEmailSentAt: ts('abandon_email_sent_at'),
  reminderSentAt: ts('reminder_sent_at'),
  // admin
  contactedAt: ts('contacted_at'),                   // abandoned follow-up done
  watchedFull: boolean('watched_full').notNull().default(false),
  bonusGiven: boolean('bonus_given').notNull().default(false),
  adminNote: text('admin_note'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('orders_public_id_uq').on(t.publicId),
  uniqueIndex('orders_rzp_order_uq').on(t.razorpayOrderId),
  uniqueIndex('orders_rzp_payment_uq').on(t.razorpayPaymentId),
  index('orders_status_created_idx').on(t.status, t.createdAt),
  index('orders_slot_idx').on(t.slotId),
  index('orders_customer_idx').on(t.customerId),
]);

export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  razorpayEventId: text('razorpay_event_id').notNull(), // X-Razorpay-Event-Id header
  type: text('type').notNull(),                         // payment.captured …
  razorpayOrderId: text('razorpay_order_id'),
  payload: jsonb('payload').notNull(),
  receivedAt: ts('received_at').notNull().defaultNow(),
  processedAt: ts('processed_at'),
  error: text('error'),
}, (t) => [uniqueIndex('payment_events_evt_uq').on(t.razorpayEventId)]);

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),                     // see SettingKey in contracts.ts
  value: jsonb('value').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const media = pgTable('media', {
  key: text('key').primaryKey(),                     // see MediaKey in contracts.ts
  kind: text('kind').notNull(),                      // 'image' | 'file'
  path: text('path').notNull(),                      // '/uploads/hero-ab12cd-1280.webp' or private file name
  srcset: jsonb('srcset'),                           // [{ w: 640, path }, { w: 1280, path }]
  width: integer('width'), height: integer('height'),
  alt: text('alt'),
  mime: text('mime'), bytes: integer('bytes'), originalName: text('original_name'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const emailLog = pgTable('email_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id),
  to: text('to').notNull(),
  template: text('template').notNull(),              // 'order_confirmation' | 'abandoned_checkout' | 'session_reminder' | 'admin_sale_alert'
  status: emailStatus('status').notNull().default('queued'),
  resendId: text('resend_id'),
  attempts: integer('attempts').notNull().default(0),
  error: text('error'),
  createdAt: ts('created_at').notNull().defaultNow(),
  sentAt: ts('sent_at'),
}, (t) => [index('email_log_order_idx').on(t.orderId), index('email_log_status_idx').on(t.status)]);

export const visitors = pgTable('visitors', {
  id: text('id').primaryKey(),                       // gz_vid cookie (uuid)
  firstSeenAt: ts('first_seen_at').notNull().defaultNow(),
  lastSeenAt: ts('last_seen_at').notNull().defaultNow(),
  firstTouch: jsonb('first_touch'),                  // Attribution object
  lastTouch: jsonb('last_touch'),
  fbc: text('fbc'), fbp: text('fbp'),
  device: text('device'),                            // mobile | tablet | desktop
  os: text('os'), browser: text('browser'),
  country: text('country'),                          // from CF-IPCountry
  customerId: uuid('customer_id').references(() => customers.id), // linked at lead
  isBot: boolean('is_bot').notNull().default(false),
});

export const events = pgTable('events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  eventId: text('event_id').notNull(),               // uuid or deterministic ('purchase_<orderId>'), shared with Pixel/CAPI
  name: text('name').notNull(),                      // EventName from taxonomy.ts
  source: text('source').notNull(),                  // 'browser' | 'server'
  visitorId: text('visitor_id'),
  sessionId: text('session_id'),
  customerId: uuid('customer_id'),
  orderId: uuid('order_id'),
  path: text('path'),
  props: jsonb('props'),                             // event-specific properties
  utmSource: text('utm_source'), utmCampaign: text('utm_campaign'), utmContent: text('utm_content'),
  device: text('device'),
  ip: text('ip'), userAgent: text('user_agent'),
  isBot: boolean('is_bot').notNull().default(false),
  occurredAt: ts('occurred_at').notNull(),           // client time, clamped to ±10 min of server
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('events_event_id_uq').on(t.eventId),
  index('events_name_time_idx').on(t.name, t.occurredAt),
  index('events_visitor_idx').on(t.visitorId, t.occurredAt),
  index('events_time_idx').on(t.occurredAt),
]);

export const capiOutbox = pgTable('capi_outbox', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  eventId: text('event_id').notNull(),
  eventName: text('event_name').notNull(),           // Meta name: 'Purchase', 'Lead', …
  payload: jsonb('payload').notNull(),               // one full CAPI data[] item, already hashed
  status: outboxStatus('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: ts('next_attempt_at').notNull().defaultNow(),
  lastError: text('last_error'),
  fbtraceId: text('fbtrace_id'),
  createdAt: ts('created_at').notNull().defaultNow(),
  sentAt: ts('sent_at'),
}, (t) => [
  uniqueIndex('capi_outbox_event_uq').on(t.eventId, t.eventName),
  index('capi_outbox_due_idx').on(t.status, t.nextAttemptAt),
]);

export const adminAudit = pgTable('admin_audit', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  action: text('action').notNull(),                  // 'settings.update', 'order.change_slot', 'media.upload', …
  target: text('target'),
  details: jsonb('details'),
  ip: text('ip'),
  createdAt: ts('created_at').notNull().defaultNow(),
});
