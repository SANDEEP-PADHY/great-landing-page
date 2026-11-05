'use client';

import { useEffect, useState } from 'react';

/** ₹ counter that eases up to 1,20,000 on load. Final value is server-rendered. */
export function HeroCounter({ target = 120000 }: { target?: number }) {
  const [n, setN] = useState(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1600);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span className="tnum">₹{n.toLocaleString('en-IN')}</span>;
}
