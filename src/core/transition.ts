/** Interpolation helpers for animated data transitions. Pure: no DOM, no rAF. */

/** Linear blend between `a` and `b` at fraction `t` (0..1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Blend two numeric maps key-by-key. Keys missing from `from` snap to the `to`
 * value (an entering mark has no prior position to ease from).
 */
export function interpolateNumberMap(
  from: Record<string, number>,
  to: Record<string, number>,
  t: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(to)) {
    out[k] = k in from ? lerp(from[k], to[k], t) : to[k];
  }
  return out;
}

/** Standard ease-in-out cubic; pins 0->0 and 1->1. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type Datum = { label: string; value: number };
type Pt = { x: number; y: number };
type Ser = { id: string; points: Pt[] };

const isDatumArray = (v: unknown): v is Datum[] =>
  Array.isArray(v) &&
  v.every((d) => d && typeof d.label === 'string' && typeof d.value === 'number');
const isSeriesArray = (v: unknown): v is Ser[] =>
  Array.isArray(v) && v.every((s) => s && typeof s.id === 'string' && Array.isArray(s.points));

/**
 * Interpolate a chart's data prop between two snapshots at fraction `t`.
 * Handles `{label,value}[]` (bar/pie, matched by label) and `{id,points}[]`
 * (line/area, matched by id then point index). Other shapes pass through as
 * `to`. Entering items (absent in `from`) snap to their target.
 */
export function interpolateChartData(from: unknown, to: unknown, t: number): unknown {
  if (isDatumArray(from) && isDatumArray(to)) {
    const prev = new Map(from.map((d) => [d.label, d.value]));
    return to.map((d) => ({ ...d, value: lerp(prev.get(d.label) ?? d.value, d.value, t) }));
  }
  if (isSeriesArray(from) && isSeriesArray(to)) {
    const prev = new Map(from.map((s) => [s.id, s.points]));
    return to.map((s) => {
      const pp = prev.get(s.id);
      return {
        ...s,
        points: s.points.map((p, i) => ({ x: p.x, y: pp && pp[i] ? lerp(pp[i].y, p.y, t) : p.y })),
      };
    });
  }
  return to;
}
