// WS1 STUB: WS4 replaces this file with the full taxonomy (Zod props + Meta mapping). Keep the EventName export.
export const EVENT_NAMES = [
  'page_view', 'view_content', 'scroll_depth', 'section_view', 'section_time', 'engaged_time', 'cta_click',
  'slot_select', 'faq_open', 'media_click', 'checkout_open', 'form_field_complete', 'form_error',
  'checkout_close', 'lead_submit', 'payment_open', 'payment_dismissed', 'payment_failed', 'purchase',
  'thank_you_view', 'whatsapp_join_click', 'calendar_add_click', 'template_download_click',
  'invoice_view_click', 'outbound_click', 'exit_intent', 'web_vital', 'client_error',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];
