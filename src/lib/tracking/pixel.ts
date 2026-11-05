/** Public Meta Pixel (dataset) ID. Env overrides; the default keeps tracking on even if the build env var is missing. */
export const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || '1450113989874525').replace(/[^0-9]/g, '');
