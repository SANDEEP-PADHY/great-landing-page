// Per-key upload rules. No server imports: also used by the Content page UI.
import type { MediaKey } from '@/lib/contracts';

export type MediaSpec = {
  label: string;
  hint: string;
  kind: 'image' | 'file';
  widths: number[];
  format: 'webp' | 'jpeg' | 'png';
  /** exact output box for cover-crop (og_image, favicon) */
  box?: { w: number; h: number };
  square?: boolean;
};

export const MEDIA_SPECS: Record<MediaKey, MediaSpec> = {
  hero: { label: 'Hero portrait', hint: '3:4 portrait, 1200×1600 recommended', kind: 'image', widths: [640, 1280], format: 'webp' },
  proof: { label: 'Razorpay proof screenshot', hint: 'Screenshot of earnings, 1280 wide', kind: 'image', widths: [640, 1280], format: 'webp' },
  host: { label: 'Host photo', hint: 'Portrait or square, 960 wide', kind: 'image', widths: [480, 960], format: 'webp' },
  claude_logo: { label: 'Claude logo', hint: 'Square, 256×256', kind: 'image', widths: [128, 256], format: 'webp' },
  bonus_template_cover: { label: 'Bonus template cover (optional)', hint: 'Preview image of the template', kind: 'image', widths: [640, 1280], format: 'webp' },
  og_image: { label: 'Social share image', hint: 'Exactly 1200×630, shown on WhatsApp / Facebook', kind: 'image', widths: [1200], format: 'jpeg', box: { w: 1200, h: 630 } },
  logo: { label: 'Logo', hint: 'Wordmark or square, 512 wide', kind: 'image', widths: [256, 512], format: 'webp' },
  favicon: { label: 'Favicon', hint: 'Square PNG, at least 512×512', kind: 'image', widths: [32, 180, 512], format: 'png', square: true },
  bonus_template_file: { label: 'Bonus template file (private)', hint: 'PDF, ZIP or HTML up to 25 MB. Buyers get it through a signed link.', kind: 'file', widths: [], format: 'webp' },
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
export const FILE_EXTS = ['pdf', 'zip', 'html'];
