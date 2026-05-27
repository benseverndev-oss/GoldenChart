import { useEffect, useRef, useState } from 'react';
import { easeInOutCubic, interpolateChartData } from '../core/transition';

/** True when the user has requested reduced motion (SSR-safe). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

/**
 * Tween a chart's data prop whenever its identity changes, over `durationMs`,
 * easing the interpolation (via the pure `interpolateChartData`). Snaps
 * instantly when disabled or under `prefers-reduced-motion`. Returns the data to
 * feed the chart this frame.
 */
export function useDataTransition<T>(data: T, durationMs = 500, enabled = true): T {
  const [frame, setFrame] = useState<T>(data);
  const prev = useRef<T>(data);

  useEffect(() => {
    if (!enabled || prefersReducedMotion() || prev.current === data) {
      setFrame(data);
      prev.current = data;
      return;
    }
    const from = prev.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setFrame(interpolateChartData(from, data, easeInOutCubic(t)) as T);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = data;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, durationMs, enabled]);

  return frame;
}
