import type { DataProfile, FieldProfile } from './profile';

/**
 * Heuristic chart recommendation. Given a data profile (and an optional intent)
 * it returns ranked chart choices with a field→role encoding and a
 * human-readable rationale. Pure and deterministic — the rationale makes every
 * choice explainable.
 */

export type Intent =
  | 'trend'
  | 'compare'
  | 'composition'
  | 'distribution'
  | 'correlation'
  | 'flow'
  | 'hierarchy';

export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'scatter'
  | 'pie'
  | 'heatmap'
  | 'sankey'
  | 'treemap'
  | 'radar';

export interface ChartRecommendation {
  chartType: ChartType;
  encoding: Record<string, string>;
  confidence: number;
  rationale: string;
}

const all = (fields: FieldProfile[], type: FieldProfile['type']) => fields.filter((f) => f.type === type);

/** Intent → chart types it should boost. */
const INTENT_BOOST: Record<Intent, ChartType[]> = {
  trend: ['line', 'area'],
  compare: ['bar', 'radar'],
  composition: ['pie', 'treemap', 'area'],
  distribution: ['bar', 'scatter'],
  correlation: ['scatter', 'heatmap'],
  flow: ['sankey'],
  hierarchy: ['treemap'],
};

export function recommendChart(profile: DataProfile, intent?: Intent): ChartRecommendation[] {
  const { fields, shape } = profile;
  const recs: ChartRecommendation[] = [];
  const q = all(fields, 'quantitative');
  const c = all(fields, 'categorical');
  const t = all(fields, 'temporal');

  const push = (r: ChartRecommendation) => recs.push(r);

  if (shape === 'graph') {
    const value = q[0]?.name ?? 'value';
    push({
      chartType: 'sankey',
      encoding: { source: 'source', target: 'target', value },
      confidence: 0.9,
      rationale: 'Source/target/value fields describe a flow between nodes.',
    });
  } else if (shape === 'hierarchy') {
    push({
      chartType: 'treemap',
      encoding: { id: 'id', parent: 'parent', value: q[0]?.name ?? 'value' },
      confidence: 0.9,
      rationale: 'id/parent fields describe a hierarchy; area encodes value.',
    });
  } else if (shape === 'matrix' && c[0]) {
    push({
      chartType: 'radar',
      encoding: { group: c[0].name, axes: q.map((f) => f.name).join(',') },
      confidence: 0.6,
      rationale: 'One category with several measures compares well on a radar.',
    });
    push({
      chartType: 'heatmap',
      encoding: { x: c[0].name, y: 'measure', value: 'value' },
      confidence: 0.5,
      rationale: 'A category × measures grid reads as a heatmap.',
    });
  } else if (t[0] && q[0]) {
    const enc = { x: t[0].name, y: q[0].name, ...(c[0] ? { series: c[0].name } : {}) };
    push({ chartType: 'line', encoding: enc, confidence: 0.85, rationale: 'A measure over time is a trend — use a line.' });
    push({ chartType: 'area', encoding: enc, confidence: 0.6, rationale: 'Area emphasizes magnitude over time.' });
  } else if (q.length >= 2 && c.length === 0) {
    push({
      chartType: 'scatter',
      encoding: { x: q[0].name, y: q[1].name },
      confidence: 0.8,
      rationale: 'Two quantitative fields show correlation as a scatter.',
    });
  } else if (c[0] && q[0]) {
    const multi = c.length >= 2;
    push({
      chartType: 'bar',
      encoding: multi ? { x: c[0].name, series: c[1].name, y: q[0].name } : { x: c[0].name, y: q[0].name },
      confidence: 0.8,
      rationale: multi ? 'A category split by a second category — grouped/stacked bars.' : 'One category, one measure — a bar chart.',
    });
    if (!multi && c[0].cardinality <= 6) {
      push({
        chartType: 'pie',
        encoding: { label: c[0].name, value: q[0].name },
        confidence: 0.5,
        rationale: 'Few categories summing to a whole can read as a pie.',
      });
    }
  }

  if (recs.length === 0) {
    push({
      chartType: 'bar',
      encoding: c[0] && q[0] ? { x: c[0].name, y: q[0].name } : {},
      confidence: 0.3,
      rationale: 'Fallback: a bar chart is the safest default.',
    });
  }

  if (intent) {
    const boosted = new Set(INTENT_BOOST[intent]);
    for (const r of recs) if (boosted.has(r.chartType)) r.confidence = Math.min(1, r.confidence + 0.15);
  }

  return recs.sort((a, b) => b.confidence - a.confidence);
}
