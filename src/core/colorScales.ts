import { DEFAULT_PALETTE } from './palette';

/**
 * Color scales for value-driven fills (heatmaps, treemaps, ramp legends). Pure
 * and DOM-free: ramps are fixed hex control points interpolated in RGB, so
 * output is deterministic and identical in the library and the headless MCP
 * build (no `d3-scale-chromatic` dependency).
 */

export type SequentialScaleName = 'viridis' | 'magma' | 'inferno' | 'blues' | 'greens' | 'oranges';
export type DivergingScaleName = 'rdbu' | 'rdylgn' | 'spectral';
export type ColorScaleName = SequentialScaleName | DivergingScaleName;

const RAMPS: Record<ColorScaleName, string[]> = {
  viridis: ['#440154', '#443983', '#31688e', '#21918c', '#35b779', '#90d743', '#fde725'],
  magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
  inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'],
  blues: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
  greens: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b'],
  oranges: ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#7f2704'],
  rdbu: ['#b2182b', '#ef8a62', '#fddbc7', '#f7f7f7', '#d1e5f0', '#67a9cf', '#2166ac'],
  rdylgn: ['#d73027', '#fc8d59', '#fee08b', '#ffffbf', '#d9ef8b', '#91cf60', '#1a9850'],
  spectral: ['#d53e4f', '#fc8d59', '#fee08b', '#ffffbf', '#e6f598', '#99d594', '#3288bd'],
};

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(clamp01(n / 255) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Interpolate a list of hex stops at `t` in [0,1], lerping in RGB space. */
export function interpolateRamp(stops: string[], t: number): string {
  if (stops.length === 0) return '#000000';
  if (stops.length === 1) return stops[0];
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const f = x - i;
  const [r1, g1, b1] = hexToRgb(stops[i]);
  const [r2, g2, b2] = hexToRgb(stops[i + 1]);
  return rgbToHex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f);
}

/** Map a numeric domain `[min,max]` onto a sequential ramp. */
export function sequentialColor(name: ColorScaleName, domain: [number, number]): (v: number) => string {
  const stops = RAMPS[name];
  const [min, max] = domain;
  const span = max - min || 1;
  return (v: number) => interpolateRamp(stops, (v - min) / span);
}

/** Lighten a hex colour toward white by `t` in [0,1]. */
function lighten(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

/**
 * A monochrome sequential scale built from a single theme colour, so a heatmap
 * reads in the vibe's own hue (graphite for `pencil`, teal for a blueprint, …)
 * rather than a generic scientific ramp. Ramps a light tint → the strong colour.
 */
export function vibeColorScale(strong: string, domain: [number, number]): (v: number) => string {
  const stops = [lighten(strong, 0.85), lighten(strong, 0.5), strong];
  const [min, max] = domain;
  const span = max - min || 1;
  return (v: number) => interpolateRamp(stops, (v - min) / span);
}

/** Map a 3-stop domain `[min,mid,max]` onto a diverging ramp, centered on `mid`. */
export function divergingColor(
  name: ColorScaleName,
  domain: [number, number, number],
): (v: number) => string {
  const stops = RAMPS[name];
  const [min, mid, max] = domain;
  const lo = mid - min || 1;
  const hi = max - mid || 1;
  return (v: number) => {
    const t = v < mid ? 0.5 * ((v - min) / lo) : 0.5 + 0.5 * ((v - mid) / hi);
    return interpolateRamp(stops, t);
  };
}

/** Stable categorical color for a string key (cycles through the palette). */
export function ordinalColor(values: string[], palette: string[] = DEFAULT_PALETTE): (v: string) => string {
  const index = new Map<string, number>();
  for (const v of values) {
    if (!index.has(v)) index.set(v, index.size);
  }
  return (v: string) => {
    const i = index.get(v) ?? index.size;
    return palette[((i % palette.length) + palette.length) % palette.length];
  };
}

/** Evenly sample `steps` colors from a ramp — handy for legends/keys. */
export function colorRamp(name: ColorScaleName, steps: number): string[] {
  const stops = RAMPS[name];
  if (steps <= 1) return [interpolateRamp(stops, 0)];
  return Array.from({ length: steps }, (_, i) => interpolateRamp(stops, i / (steps - 1)));
}

/** Names available for a color scale, useful for tool/resource enumeration. */
export const COLOR_SCALE_NAMES = Object.keys(RAMPS) as ColorScaleName[];
