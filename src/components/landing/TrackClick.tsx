'use client';

import type { CSSProperties, ReactNode } from 'react';
import { track } from '@/lib/tracking/client';

/** Wraps children in a plain button that fires a tracking event on click. */
export function TrackClick({
  event,
  props,
  label,
  style,
  children,
}: {
  event: 'media_click';
  props?: Record<string, unknown>;
  label: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => track(event, props)}
      style={{ all: 'unset', display: 'block', cursor: 'zoom-in', ...style }}
    >
      {children}
    </button>
  );
}
