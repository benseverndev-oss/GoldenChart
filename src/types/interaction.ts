export type MarkKind = 'bar' | 'point' | 'slice' | 'cell' | 'arc' | 'node' | 'edge';

/**
 * Per-mark metadata carried inertly in the SVG as `data-gc-*` attributes. `cx`/`cy`
 * are absolute pixel anchors so later interactivity phases can position/snap
 * without access to the chart's (inline) d3 scales.
 */
export interface MarkMeta {
  kind: MarkKind;
  series?: string;
  index: number;
  label?: string;
  value: number | Record<string, number>;
  cx: number;
  cy: number;
}
