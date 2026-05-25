import type { ChartDatum, DataTableModel, Series } from '../types/charts';

/**
 * Build screen-reader data-table models from chart inputs. Pure data shaping —
 * keeps the accessibility fallback in lockstep with what each chart draws.
 */

export function datumTable(data: ChartDatum[], caption?: string): DataTableModel {
  return {
    caption,
    columns: ['Label', 'Value'],
    rows: data.map((d) => [d.label, d.value]),
  };
}

export function seriesTable(series: Series[], caption?: string): DataTableModel {
  return {
    caption,
    columns: ['Series', 'X', 'Y'],
    rows: series.flatMap((s) => s.points.map((p) => [s.id, p.x, p.y] as (string | number)[])),
  };
}
