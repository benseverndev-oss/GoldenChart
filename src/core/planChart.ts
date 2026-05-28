import { profileData } from './profile';
import { recommendChart } from './recommend';
import type { ChartRecommendation, ChartType, Intent } from './recommend';
import { compileChart } from './compile';
import type { CompiledChart } from './compile';
import { parseChartQuery } from './queryParse';
import type { ChartHints } from './queryParse';

type Row = Record<string, unknown>;

/**
 * The shared orchestrator behind the natural-language front door. Profiles the
 * data, parses the query into hints, lets the existing recommender pick a chart
 * (nudged by the parsed intent), applies any explicit chart-type/role/vibe
 * overrides, and compiles concrete props. Pure and DOM-free; the parser only
 * nudges the recommender so the two can never disagree.
 */
export interface ChartPlan {
  hints: ChartHints;
  recommendation: ChartRecommendation;
  alternatives: ChartRecommendation[];
  compiled: CompiledChart;
}

const EMPTY_HINTS: ChartHints = { unresolved: [], confidence: 0 };

/** Translate a neutral role (x/y/series/source/target) to a chart's encoding key. */
function encodingKeyFor(chartType: ChartType, role: string): string {
  if (chartType === 'pie') return role === 'x' ? 'label' : role === 'y' ? 'value' : role;
  if (chartType === 'treemap') return role === 'x' ? 'id' : role === 'y' ? 'value' : role;
  if (chartType === 'sankey') return role === 'y' ? 'value' : role;
  return role; // bar/line/area/scatter use x/y/series/source/target directly
}

/** Re-key an encoding so it satisfies a chart we're forcing it into. */
function adaptEncoding(base: Record<string, string>, chartType: ChartType): Record<string, string> {
  switch (chartType) {
    case 'pie':
      return { label: base.label ?? base.x ?? base.id, value: base.value ?? base.y };
    case 'treemap':
      return { id: base.id ?? base.x, parent: base.parent, value: base.value ?? base.y };
    case 'sankey':
      return { source: base.source ?? base.x, target: base.target, value: base.value ?? base.y };
    case 'scatter':
    case 'line':
    case 'area':
    case 'bar':
      return { x: base.x ?? base.label, y: base.y ?? base.value, series: base.series };
    default:
      return { ...base };
  }
}

export function planChart(data: Row[], opts: { query?: string; intent?: Intent } = {}): ChartPlan {
  const profile = profileData(data);
  const hints = opts.query ? parseChartQuery(opts.query, profile) : EMPTY_HINTS;

  const intent = hints.intent ?? opts.intent;
  const recs = recommendChart(profile, intent);

  // Pick the chart: an explicit override wins; otherwise the top recommendation.
  let chosen: ChartRecommendation;
  if (hints.chartType) {
    const match = recs.find((r) => r.chartType === hints.chartType);
    chosen = match ?? {
      chartType: hints.chartType,
      encoding: adaptEncoding(recs[0]?.encoding ?? {}, hints.chartType),
      confidence: Math.max(0.4, hints.confidence),
      rationale: `Requested explicitly as a ${hints.chartType}.`,
    };
  } else {
    chosen = recs[0] ?? {
      chartType: 'bar',
      encoding: {},
      confidence: 0.3,
      rationale: 'Fallback bar chart.',
    };
  }

  // Patch the encoding with parsed field roles, mapped to this chart's keys.
  if (hints.roles) {
    const patch: Record<string, string> = {};
    for (const [role, field] of Object.entries(hints.roles)) {
      patch[encodingKeyFor(chosen.chartType, role)] = field;
    }
    const encoding = { ...chosen.encoding, ...patch };
    // An override can leave a stale series identical to the x/y field — a
    // degenerate group that renders a redundant legend over the bars. Drop it
    // unless the query explicitly asked for that series.
    if (
      encoding.series &&
      encoding.series !== patch.series &&
      (encoding.series === encoding.x || encoding.series === encoding.y)
    ) {
      delete encoding.series;
    }
    chosen = { ...chosen, encoding };
  }

  const compiled = compileChart(data, chosen);
  if (hints.props) Object.assign(compiled.props, hints.props);
  if (hints.vibe !== undefined) compiled.props.vibe = hints.vibe;

  return {
    hints,
    recommendation: chosen,
    alternatives: recs.filter((r) => r !== chosen),
    compiled,
  };
}
