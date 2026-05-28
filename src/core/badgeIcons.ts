/**
 * Icon stroke paths and fixed tone colors for `Badge`. Pure data, no React.
 *
 * Icon authoring contract (per spec):
 *  - viewBox 16x16
 *  - stroke-only (no `Z`, no fills)
 *  - single open sub-path preferred; if a glyph genuinely needs two strokes,
 *    the entry may be `string[]` and the component renders each as its own
 *    Rough path.
 */

export const BADGE_TONES = ['neutral', 'info', 'success', 'warn', 'danger'] as const;
export type BadgeTone = (typeof BADGE_TONES)[number];

export const BADGE_ICONS = [
  'star',
  'fork',
  'issue',
  'tag',
  'commit',
  'license',
  'lang',
  'check',
] as const;
export type BadgeIcon = (typeof BADGE_ICONS)[number];

export const isBadgeTone = (x: unknown): x is BadgeTone =>
  (BADGE_TONES as readonly string[]).includes(x as string);
export const isBadgeIcon = (x: unknown): x is BadgeIcon =>
  (BADGE_ICONS as readonly string[]).includes(x as string);

/** Stroke-only path data, authored against a 16x16 box. */
export const BADGE_ICON_PATHS: Record<BadgeIcon, string | string[]> = {
  // Five-point star outline (open at the top tip so it remains an open stroke).
  star: 'M8 1 L10 6 L15 6 L11 9.5 L12.5 14.5 L8 11.5 L3.5 14.5 L5 9.5 L1 6 L6 6',
  // Two circles + a connector (git fork glyph).
  fork: [
    'M4 3 a2 2 0 1 0 0 4 a2 2 0 1 0 0 -4',
    'M12 3 a2 2 0 1 0 0 4 a2 2 0 1 0 0 -4',
    'M4 7 L4 11 a2 2 0 0 0 2 2 L10 13',
    'M12 7 L12 9',
  ],
  // Circle with vertical bar (open issue indicator).
  issue: ['M8 1 a7 7 0 1 0 0 14 a7 7 0 1 0 0 -14', 'M8 5 L8 9', 'M8 11 L8 12'],
  // Price-tag silhouette (open stroke; no Z).
  tag: 'M1 8 L8 1 L15 1 L15 8 L8 15',
  // Git commit dot + line.
  commit: ['M2 8 L6 8', 'M10 8 L14 8', 'M8 6 a2 2 0 1 0 0 4 a2 2 0 1 0 0 -4'],
  // Scroll silhouette (open).
  license: ['M3 2 L13 2 L13 13 L8 13', 'M3 2 L3 13 L8 13 L8 11', 'M5 5 L11 5', 'M5 8 L11 8'],
  // Three vertical bars (language stack).
  lang: ['M3 13 L3 5', 'M8 13 L8 3', 'M13 13 L13 7'],
  // Check mark.
  check: 'M2 9 L6 13 L14 3',
};

export const BADGE_TONE_COLORS: Record<'success' | 'warn' | 'danger', string> = {
  success: '#3a8a3a',
  warn: '#b8860b',
  danger: '#b13a3a',
};
