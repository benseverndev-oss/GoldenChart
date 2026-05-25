/**
 * Default categorical palette for charts that need many distinct colors
 * (pie slices, multi-series). Vibe-independent on purpose — the vibe controls
 * texture/roughness, the palette controls hue.
 */
export const DEFAULT_PALETTE = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

export function colorAt(index: number, palette: string[] = DEFAULT_PALETTE): string {
  return palette[((index % palette.length) + palette.length) % palette.length];
}
