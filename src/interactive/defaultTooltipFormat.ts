import type { MarkMeta } from '../types/interaction';

export interface TooltipContent {
  title?: string;
  rows: [string, string][];
}

/** Default MarkMeta -> tooltip content: label as the title, value(s) as rows. */
export function defaultTooltipFormat(mark: MarkMeta): TooltipContent {
  const title = mark.label ?? mark.series;
  const rows: [string, string][] =
    typeof mark.value === 'number'
      ? [['value', String(mark.value)]]
      : Object.entries(mark.value).map(([k, v]) => [k, String(v)]);
  return title !== undefined ? { title, rows } : { rows };
}
