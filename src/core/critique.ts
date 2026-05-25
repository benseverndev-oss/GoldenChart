import type { CompiledChart } from './compile';
import type { DataProfile } from './profile';
import { DEFAULT_PALETTE } from './palette';
import { measureText } from './text';

/**
 * Chart critique: flag common dataviz mistakes in a compiled chart so an agent
 * can refine it. Each rule fires on a concrete, testable condition and carries a
 * human-readable message plus an optional `fix` patch describing the change.
 * Pure: it inspects the compiled props + data profile, never renders.
 */

export interface Critique {
  severity: 'info' | 'warn';
  /** Stable rule id, for dedup / filtering in a refine loop. */
  rule: string;
  message: string;
  /** A concrete, machine-readable patch an agent can apply, where applicable. */
  fix?: Record<string, unknown>;
}

export interface CritiqueOptions {
  /** Plot width (px) used for label-collision detection. */
  width?: number;
}

const FONT_SIZE = 12;
const FONT_FAMILY = 'sans-serif';
const SERIES_SOFT_LIMIT = 7;

interface DatumLike {
  label: string;
  value: number;
}

const isSingleBar = (c: CompiledChart): boolean =>
  c.component === 'BarChart' && Array.isArray(c.props.data) && c.props.mode == null;

/** Series count for color-bearing charts, or null when colour isn't the encoding. */
function seriesColorCount(c: CompiledChart): number | null {
  const { component, props } = c;
  if ((component === 'LineChart' || component === 'AreaChart' || component === 'RadarChart') && Array.isArray(props.series)) {
    return props.series.length;
  }
  if (component === 'BarChart' && Array.isArray(props.seriesKeys)) return props.seriesKeys.length;
  return null;
}

export function critiqueChart(
  compiled: CompiledChart,
  profile: DataProfile,
  opts: CritiqueOptions = {},
): Critique[] {
  const critiques: Critique[] = [];
  const { component, props } = compiled;
  const width = opts.width ?? 640;

  // Too many categories — bars or pie slices.
  if (isSingleBar(compiled)) {
    const data = props.data as DatumLike[];
    if (data.length > 12) {
      critiques.push({
        severity: 'warn',
        rule: 'too-many-categories',
        message: `A bar chart with ${data.length} bars is hard to scan; keep the top ~12 and group the rest into "Other".`,
        fix: { keepTopCategories: 12, groupRemainderAs: 'Other' },
      });
    }
  }
  if (component === 'PieChart' && Array.isArray(props.data)) {
    const data = props.data as DatumLike[];
    if (data.length > 6) {
      critiques.push({
        severity: 'warn',
        rule: 'too-many-categories',
        message: `A pie with ${data.length} slices is hard to compare; a bar chart ranks ${data.length} categories more clearly.`,
        fix: { chartType: 'bar' },
      });
    }
    if (data.some((d) => d.value < 0)) {
      critiques.push({
        severity: 'warn',
        rule: 'pie-not-part-of-whole',
        message: 'A pie chart shows parts of a whole; negative values have no meaningful slice — use a bar chart.',
        fix: { chartType: 'bar' },
      });
    }
  }

  // Bars are always zero-based here, so the risk isn't truncation but low
  // contrast: values clustered high above zero look nearly identical.
  if (isSingleBar(compiled)) {
    const values = (props.data as DatumLike[]).map((d) => d.value);
    if (values.length >= 2 && values.every((v) => v > 0)) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max > 0 && min / max > 0.7) {
        critiques.push({
          severity: 'info',
          rule: 'low-bar-contrast',
          message: `Bars are correctly zero-based, but the values cluster between ${min} and ${max}, so they look nearly identical; a line or dot plot would surface the differences.`,
          fix: { chartType: 'line' },
        });
      }
    }
  }

  // A time field plus a bar chart usually wants to be a trend line.
  if (component === 'BarChart' && profile.fields.some((f) => f.type === 'temporal')) {
    critiques.push({
      severity: 'info',
      rule: 'temporal-trend',
      message: 'The data has a time field; a line or area chart shows a trend over time more clearly than bars.',
      fix: { chartType: 'line' },
    });
  }

  // Axis-label collision — real text metrics, not guesses.
  if (isSingleBar(compiled)) {
    const data = props.data as DatumLike[];
    if (data.length > 0) {
      const band = width / data.length;
      const widest = Math.max(...data.map((d) => measureText(d.label, FONT_SIZE, FONT_FAMILY).width));
      if (widest > band - 4) {
        critiques.push({
          severity: 'warn',
          rule: 'axis-label-collision',
          message: `The widest x-axis label (~${Math.round(widest)}px) is wider than its ${Math.round(band)}px slot, so labels will overlap; rotate or wrap them.`,
          fix: { rotateLabels: 45 },
        });
      }
    }
  }

  // Too many series colours — beyond the palette, colours repeat.
  const seriesCount = seriesColorCount(compiled);
  if (seriesCount != null) {
    if (seriesCount > DEFAULT_PALETTE.length) {
      critiques.push({
        severity: 'warn',
        rule: 'too-many-series-colors',
        message: `${seriesCount} series exceed the ${DEFAULT_PALETTE.length}-colour palette, so colours repeat and become ambiguous; cap the series or use a sequential colour scale.`,
        fix: { maxSeries: DEFAULT_PALETTE.length },
      });
    } else if (seriesCount > SERIES_SOFT_LIMIT) {
      critiques.push({
        severity: 'info',
        rule: 'too-many-series-colors',
        message: `${seriesCount} series approach the limit of distinguishable colours; consider grouping the smaller series.`,
        fix: { maxSeries: SERIES_SOFT_LIMIT },
      });
    }
  }

  return critiques;
}
