import type { Series, SeriesPoint } from '../types/charts';
import type { Annotation, EmphasisSpec } from './annotations';

/** Least-squares fit of `y = slope·x + intercept` over a point set. */
export function linearRegression(points: SeriesPoint[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxy += p.x * p.y;
    sxx += p.x * p.x;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  return { slope, intercept: (sy - slope * sx) / n };
}

/** The point a `pick` strategy selects (by y for max/min/peak, by order otherwise). */
export function pickPoint(
  points: SeriesPoint[],
  pick: 'max' | 'min' | 'first' | 'last' | 'peak',
): SeriesPoint | undefined {
  if (points.length === 0) return undefined;
  switch (pick) {
    case 'first':
      return points[0];
    case 'last':
      return points[points.length - 1];
    case 'min':
      return points.reduce((a, b) => (b.y < a.y ? b : a));
    case 'max':
    case 'peak':
      return points.reduce((a, b) => (b.y > a.y ? b : a));
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

function fillTemplate(tpl: string, point: SeriesPoint, seriesId: string): string {
  return tpl
    .replace(/\{label\}/g, String(point.x))
    .replace(/\{value\}/g, String(round(point.y)))
    .replace(/\{series\}/g, seriesId);
}

export interface ResolvedEmphasis {
  /** Concrete overlay annotations (trend segments, auto-callouts). */
  annotations: Annotation[];
  /** Series ids to render faded (highlight-series with mode `mute-others`). */
  muted: Set<string>;
  /** Series ids to emphasize. */
  emphasized: Set<string>;
}

const seriesFor = (series: Series[], id?: string): Series | undefined =>
  id == null ? series[0] : series.find((s) => s.id === id);

/**
 * Turn data-relative `EmphasisSpec`s into drawable annotations plus per-series
 * highlight state. Pure; degrades to no-ops when a target series is missing.
 */
export function resolveEmphasis(series: Series[], specs: EmphasisSpec[]): ResolvedEmphasis {
  const annotations: Annotation[] = [];
  const muted = new Set<string>();
  const emphasized = new Set<string>();
  let anyHighlight = false;

  for (const spec of specs) {
    if (spec.kind === 'highlight-series') {
      emphasized.add(spec.id);
      if ((spec.mode ?? 'mute-others') === 'mute-others') anyHighlight = true;
      continue;
    }

    const target = seriesFor(series, spec.series);
    const points = target?.points ?? [];
    if (points.length === 0) continue;

    if (spec.kind === 'trend') {
      const xs = points.map((p) => p.x);
      const x1 = Math.min(...xs);
      const x2 = Math.max(...xs);
      if (spec.method === 'mean') {
        const mean = points.reduce((s, p) => s + p.y, 0) / points.length;
        annotations.push({
          kind: 'segment',
          x1,
          y1: mean,
          x2,
          y2: mean,
          color: spec.color,
          label: 'mean',
        });
      } else {
        const { slope, intercept } = linearRegression(points);
        annotations.push({
          kind: 'segment',
          x1,
          y1: slope * x1 + intercept,
          x2,
          y2: slope * x2 + intercept,
          color: spec.color,
        });
      }
    } else if (spec.kind === 'auto-callout') {
      const pt = pickPoint(points, spec.pick);
      if (pt) {
        const text = fillTemplate(spec.template ?? '{label}: {value}', pt, target?.id ?? '');
        annotations.push({ kind: 'point-callout', x: pt.x, y: pt.y, text, color: spec.color });
      }
    }
  }

  if (anyHighlight) {
    for (const s of series) if (!emphasized.has(s.id)) muted.add(s.id);
  }
  return { annotations, muted, emphasized };
}
