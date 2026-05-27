import { useCallback, useRef, useState } from 'react';
import { wheelZoom, panDomain, clampDomain, focusFraction, type Domain } from '../core/zoom';
import { extentOf } from '../core/scales';

/**
 * Pure: derive the continuous x data-extent from a wrapped chart's props.
 * Handles point series (`series[].points[].x`) and `{ x }` datum arrays
 * (scatter). Returns null for charts without a continuous x (e.g. categorical
 * bars), which disables zoom for them.
 */
export function chartXExtent(props: Record<string, unknown>): Domain | null {
  const series = props.series as { points?: { x: number }[] }[] | undefined;
  if (Array.isArray(series)) {
    const xs = series.flatMap((s) => (s.points ?? []).map((p) => p.x));
    return xs.length ? extentOf(xs, false) : null;
  }
  const data = props.data as { x?: number }[] | undefined;
  if (Array.isArray(data) && data.length > 0 && data.every((d) => typeof d?.x === 'number')) {
    return extentOf(data.map((d) => d.x as number), false);
  }
  return null;
}

export interface UseZoomPan {
  /** Current view domain, or null when not zoomed (chart uses its default extent). */
  domain: Domain | null;
  onWheel: (e: WheelEvent) => void;
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: () => void;
  reset: () => void;
}

/**
 * Track a view domain driven by wheel-zoom and (optionally) drag-pan, both
 * clamped to `bounds`. All domain math is delegated to the pure `core/zoom`
 * helpers; this hook only wires pointer state. No-op when `bounds` is null.
 */
export function useZoomPan(bounds: Domain | null, opts: { pan?: boolean; minSpan?: number } = {}): UseZoomPan {
  const minSpan = opts.minSpan ?? (bounds ? (bounds[1] - bounds[0]) / 1000 || 1 : 1);
  const [domain, setDomain] = useState<Domain | null>(null);
  const drag = useRef<{ x: number; domain: Domain } | null>(null);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (!bounds) return;
      e.preventDefault();
      const rect = (e.currentTarget as Element).getBoundingClientRect();
      const focus = focusFraction(e.clientX, rect.left, rect.width);
      setDomain((d) => wheelZoom(d ?? bounds, focus, e.deltaY, bounds, minSpan));
    },
    [bounds, minSpan],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!bounds || !opts.pan) return;
      drag.current = { x: e.clientX, domain: domain ?? bounds };
    },
    [bounds, opts.pan, domain],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current;
      if (!d || !bounds) return;
      const rect = (e.currentTarget as Element).getBoundingClientRect();
      const span = d.domain[1] - d.domain[0];
      const deltaData = -((e.clientX - d.x) / rect.width) * span; // drag right -> domain moves left
      setDomain(clampDomain(panDomain(d.domain, deltaData), bounds, minSpan));
    },
    [bounds, minSpan],
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const reset = useCallback(() => setDomain(null), []);

  return { domain, onWheel, onPointerDown, onPointerMove, onPointerUp, reset };
}
