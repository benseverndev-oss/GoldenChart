/**
 * Pure data-transform helpers for the `render_with_revision` MCP tool. Each
 * helper maps a `suggest_improvements` fix patch onto a concrete change to
 * the raw record array an agent feeds back into the rendering pipeline.
 */

export interface Revisions {
  /**
   * Keep the top N categories (by `value`) and roll the rest into a single
   * "Other" row. Matches the `too-many-categories` fix on bars/pies.
   */
  keepTopCategories?: number;
  /** Label for the grouped remainder row when `keepTopCategories` is set. */
  groupRemainderAs?: string;
  /**
   * Keep only the top N series. Picks a deterministic ranking; "top" here
   * means *first* in the input order so the agent can control the ranking
   * upstream. Matches the `too-many-series-colors` fix.
   */
  maxSeries?: number;
  /** Force a chart type, bypassing the recommender. Matches `chartType` fixes. */
  chartType?: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
}

interface CategoricalRecord {
  [key: string]: unknown;
}

/**
 * Trim a categorical dataset to the top N categories by the chosen value
 * field; sum the remainder into one record labelled `groupRemainderAs`.
 * Looks up the categorical (string-valued) and numeric (number-valued) keys
 * from the first record so it works with any field naming.
 */
export function trimTopCategories(
  data: CategoricalRecord[],
  keep: number,
  groupAs: string,
): CategoricalRecord[] {
  if (data.length === 0 || keep <= 0 || data.length <= keep) return data;
  const sample = data[0];
  const labelKey = Object.keys(sample).find((k) => typeof sample[k] === 'string');
  const valueKey = Object.keys(sample).find((k) => typeof sample[k] === 'number');
  if (!labelKey || !valueKey) return data;

  // `keep` is the total row count we want post-trim. Reserve one slot for the
  // "Other" bucket whenever there's a remainder, so the output has exactly
  // `keep` rows and downstream critique thresholds (e.g. > 12 bars) clear.
  const sorted = [...data].sort((a, b) => (b[valueKey] as number) - (a[valueKey] as number));
  const headCount = Math.max(1, keep - 1);
  const head = sorted.slice(0, headCount);
  const tail = sorted.slice(headCount);
  if (tail.length === 0) return head;
  const remainder = tail.reduce((sum, row) => sum + ((row[valueKey] as number) ?? 0), 0);
  return [...head, { [labelKey]: groupAs, [valueKey]: remainder } as CategoricalRecord];
}

/**
 * Trim a series-by-row dataset down to the first N distinct series. Series
 * are detected by scanning all unique non-numeric keys; "first" is the
 * order they appear in the data, so an agent can control ranking upstream.
 */
export function trimTopSeries(data: CategoricalRecord[], max: number): CategoricalRecord[] {
  if (data.length === 0 || max <= 0) return data;
  const sample = data[0];
  const seriesKey = Object.keys(sample).find(
    (k) => typeof sample[k] === 'string' && k !== Object.keys(sample)[0],
  );
  if (!seriesKey) return data;
  const seen: string[] = [];
  for (const row of data) {
    const v = row[seriesKey];
    if (typeof v === 'string' && !seen.includes(v)) seen.push(v);
    if (seen.length >= max) break;
  }
  return data.filter((row) => seen.includes(row[seriesKey] as string));
}

/** Apply a `Revisions` patch to the raw input data. */
export function applyRevisions(
  data: CategoricalRecord[],
  revisions: Revisions,
): CategoricalRecord[] {
  let out = data;
  if (revisions.keepTopCategories != null) {
    out = trimTopCategories(
      out,
      revisions.keepTopCategories,
      revisions.groupRemainderAs ?? 'Other',
    );
  }
  if (revisions.maxSeries != null) {
    out = trimTopSeries(out, revisions.maxSeries);
  }
  return out;
}

/** Map a forced `chartType` revision onto the recommender's `Intent`. */
export function intentForChartType(chartType: Revisions['chartType']): string | undefined {
  switch (chartType) {
    case 'bar':
      return 'compare';
    case 'line':
    case 'area':
      return 'trend';
    case 'pie':
      return 'composition';
    case 'scatter':
      return 'correlation';
    default:
      return undefined;
  }
}
