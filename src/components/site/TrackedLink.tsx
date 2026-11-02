'use client';

import type { CSSProperties, ReactNode } from 'react';
import { track } from '@/lib/tracking/client';
import type { EventName } from '@/lib/tracking/taxonomy';

/** An <a> that fires a tracking event on click. */
export function TrackedLink({
  href, event, props, className, style, target, children,
}: {
  href: string;
  event: EventName;
  props?: Record<string, unknown>;
  className?: string;
  style?: CSSProperties;
  target?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      onClick={() => track(event, props)}
    >
      {children}
    </a>
  );
}
