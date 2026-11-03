import { z } from 'zod';

/**
 * Canonical event taxonomy (docs/architecture/07-tracking-pixel-capi.md).
 * Pure module: safe to import from client and server.
 */

export const CONTENT_ID = 'webinar_nov_2026';
export const CONTENT_NAME = 'Live webinar seat';
export const LANDING_VALUE_RUPEES = 499;
export const CURRENCY = 'INR';

type Props = Record<string, unknown>;

export type MetaMapping = {
  /** Meta event name (may depend on props). */
  name: string | ((p: Props) => string);
  kind: 'std' | 'custom';
  /** Only send when this returns true (default: always). */
  when?: (p: Props) => boolean;
  /** Build Meta custom_data from internal props. */
  data?: (p: Props) => Record<string, unknown>;
};

export type TaxonomyEntry = {
  props: z.ZodType<Props>;
  /** Browser Pixel call (also used to derive the CAPI event name). */
  pixel?: MetaMapping;
  /** Also forward to Conversions API (browser-originated events). */
  capi?: boolean | ((p: Props) => boolean);
};

const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough() as unknown as z.ZodType<Props>;
const str = z.string().max(300);
const num = z.number().finite();
const slot = z.string().max(8);
const empty = obj({});

const value = (p: Props) => (typeof p.value === 'number' ? p.value : LANDING_VALUE_RUPEES);
const commerce = (p: Props) => ({
  value: value(p),
  currency: CURRENCY,
  content_ids: [CONTENT_ID],
  content_type: 'product',
  content_name: CONTENT_NAME,
  num_items: 1,
});

export const TAXONOMY = {
  page_view: { props: obj({ path: str.optional(), title: str.optional() }), pixel: { name: 'PageView', kind: 'std' }, capi: true },
  view_content: {
    props: obj({ content_name: str.optional(), value: num.optional(), currency: str.optional() }),
    pixel: { name: 'ViewContent', kind: 'std', data: commerce },
    capi: true,
  },
  scroll_depth: {
    props: obj({ percent: z.number().int().min(0).max(100) }),
    pixel: { name: 'ScrollDepth', kind: 'custom', when: (p) => p.percent === 50 || p.percent === 90, data: (p) => ({ percent: p.percent }) },
    capi: (p) => p.percent === 50 || p.percent === 90,
  },
  section_view: { props: obj({ section: str, index: z.number().int().optional() }) },
  section_time: { props: obj({ sections: z.record(z.string().max(60), z.number().min(0).max(3_600_000)) }) },
  engaged_time: {
    props: obj({ seconds_total: z.number().int().min(0).max(86_400) }),
    pixel: {
      name: (p) => `Engaged${p.seconds_total}s`,
      kind: 'custom',
      when: (p) => p.seconds_total === 30 || p.seconds_total === 120,
      data: (p) => ({ seconds: p.seconds_total }),
    },
    capi: (p) => p.seconds_total === 30 || p.seconds_total === 120,
  },
  cta_click: {
    props: obj({ location: str, slot_id: slot.optional() }),
    pixel: { name: 'CTAClick', kind: 'custom', data: (p) => ({ location: p.location }) },
    capi: true,
  },
  slot_select: { props: obj({ slot_id: slot, location: str.optional() }) },
  faq_open: { props: obj({ index: z.number().int(), question: str.optional() }) },
  media_click: { props: obj({ key: str }) },
  checkout_open: {
    props: obj({ location: str.optional(), slot_id: slot.optional(), value: num.optional(), currency: str.optional() }),
    pixel: { name: 'InitiateCheckout', kind: 'std', data: commerce },
    capi: true,
  },
  form_field_complete: { props: obj({ field: z.enum(['name', 'phone', 'email']) }) },
  form_error: { props: obj({ field: str.optional(), code: str.optional() }) },
  checkout_close: { props: obj({ stage: str.optional() }) },
  lead_submit: {
    props: obj({ slot_id: slot.optional(), value: num.optional() }),
    // Browser Pixel Lead; CAPI Lead is sent by the server (recordServerEvent) with user data, same event_id.
    pixel: { name: 'Lead', kind: 'std', data: commerce },
  },
  payment_open: {
    props: obj({ slot_id: slot.optional(), value: num.optional() }),
    pixel: { name: 'AddPaymentInfo', kind: 'std', data: commerce },
    capi: true,
  },
  payment_dismissed: { props: obj({ slot_id: slot.optional() }), pixel: { name: 'PaymentDismissed', kind: 'custom' } },
  payment_failed: {
    props: obj({ code: str.optional(), reason: str.optional(), method: str.optional() }),
    pixel: { name: 'PaymentFailed', kind: 'custom', data: (p) => ({ code: p.code }) },
  },
  purchase: {
    props: obj({
      value: num.optional(),
      currency: str.optional(),
      order_id: str.optional(),
      slot_id: slot.optional(),
    }),
    // Browser Pixel Purchase on the thank-you page; CAPI Purchase is sent by the server (fulfilOrder).
    pixel: {
      name: 'Purchase',
      kind: 'std',
      data: (p) => ({ ...commerce(p), order_id: p.order_id }),
    },
  },
  thank_you_view: { props: obj({ status: str.optional() }) },
  whatsapp_join_click: { props: empty, pixel: { name: 'JoinWhatsApp', kind: 'custom' }, capi: true },
  calendar_add_click: { props: obj({ type: z.enum(['google', 'ics']).optional() }) },
  template_download_click: { props: empty },
  invoice_view_click: { props: empty },
  outbound_click: { props: obj({ href: z.string().max(500), text: str.optional() }) },
  exit_intent: { props: obj({ action: z.enum(['shown', 'clicked', 'dismissed']) }) },
  web_vital: {
    props: obj({ metric: z.enum(['LCP', 'CLS', 'INP', 'FCP', 'TTFB']), value: num, rating: str.optional() }),
  },
  client_error: { props: obj({ message: str, source: str.optional(), line: z.number().int().optional() }) },
} satisfies Record<string, TaxonomyEntry>;

export type EventName = keyof typeof TAXONOMY;
export const EVENT_NAMES = Object.keys(TAXONOMY) as EventName[];

export function isEventName(n: unknown): n is EventName {
  return typeof n === 'string' && Object.prototype.hasOwnProperty.call(TAXONOMY, n);
}

export function entryFor(name: EventName): TaxonomyEntry {
  return TAXONOMY[name] as TaxonomyEntry;
}

/** The Meta mapping for an event, or null if it should not go to the Pixel for these props. */
export function pixelMapping(name: EventName, props: Props): { name: string; kind: 'std' | 'custom'; data: Record<string, unknown> } | null {
  const m = entryFor(name).pixel;
  if (!m) return null;
  if (m.when && !m.when(props)) return null;
  return { name: typeof m.name === 'function' ? m.name(props) : m.name, kind: m.kind, data: m.data ? m.data(props) : {} };
}

export function shouldForwardToCapi(name: EventName, props: Props): boolean {
  const e = entryFor(name);
  if (!e.capi) return false;
  if (!pixelMapping(name, props)) return false;
  return typeof e.capi === 'function' ? e.capi(props) : true;
}

/** Wire format of one browser event (common props added by the tracker). */
export const BrowserEvent = z.object({
  event_id: z.string().min(8).max(80),
  name: z.string().refine(isEventName, 'unknown event'),
  occurred_at: z.string().max(40),
  visitor_id: z.string().max(80).optional(),
  session_id: z.string().max(80).optional(),
  path: z.string().max(500).optional(),
  page_title: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  viewport: z.string().max(20).optional(),
  utm: z.record(z.string(), z.string().nullable().optional()).optional(),
  fbc: z.string().max(200).optional(),
  fbp: z.string().max(200).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});
export type BrowserEvent = z.infer<typeof BrowserEvent>;
