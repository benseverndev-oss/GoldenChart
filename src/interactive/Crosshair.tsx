import { RoughLine } from '../primitives/RoughLine';

export interface PixelMark {
  cx: number;
  cy: number;
}

/** Nearest mark to (x, y) by pixel distance — used to snap a crosshair/selection
 *  to the closest datum without needing the chart's scales. Returns null when
 *  there are no marks. */
export function nearestMark<T extends PixelMark>(marks: readonly T[], x: number, y: number): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const m of marks) {
    const d = (m.cx - x) ** 2 + (m.cy - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

export interface CrosshairProps {
  /** Snapped x position (svg space). */
  x: number;
  /** Plot height to span. */
  height: number;
}

/** A sketched vertical focus line at the snapped x. */
export function Crosshair({ x, height }: CrosshairProps) {
  return <RoughLine x1={x} y1={0} x2={x} y2={height} />;
}
