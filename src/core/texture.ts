/**
 * Deterministic paper-grain speckle. Pure and DOM-free: given a surface size and
 * a seed it returns faint specks the renderer paints behind the data so matte
 * vibes read as textured paper rather than a flat fill. Seeded so output stays
 * byte-stable across renders/SSR (and golden snapshots).
 */

export interface Speck {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
}

/** Speckle intensity tier. `medium` is the original (and default) look. */
export type SpeckleTier = 'subtle' | 'medium';

interface TierConfig {
  /** One speck per ~this many px² (bigger = sparser). */
  divisor: number;
  rMin: number;
  rMax: number;
  oMin: number;
  oMax: number;
}

// Tiers chosen against the live before/after comparison. `medium` keeps the
// exact constants (and rand() call order) the feature shipped with, so the
// presets that default to it render byte-identically.
const TIERS: Record<SpeckleTier, TierConfig> = {
  subtle: { divisor: 950, rMin: 0.4, rMax: 0.9, oMin: 0.04, oMax: 0.1 },
  medium: { divisor: 550, rMin: 0.5, rMax: 1.0, oMin: 0.05, oMax: 0.13 },
};

/** Small, fast, seedable PRNG (mulberry32) — stable across platforms. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export function paperSpeckles(
  width: number,
  height: number,
  seed: number,
  tier: SpeckleTier = 'medium',
): Speck[] {
  if (width <= 0 || height <= 0) return [];
  const t = TIERS[tier];
  const rand = mulberry32(seed);
  const count = Math.round((width * height) / t.divisor);
  const specks: Speck[] = [];
  for (let i = 0; i < count; i++) {
    specks.push({
      cx: round(rand() * width),
      cy: round(rand() * height),
      r: round(t.rMin + rand() * (t.rMax - t.rMin), 2),
      opacity: round(t.oMin + rand() * (t.oMax - t.oMin), 3),
    });
  }
  return specks;
}

/**
 * Map a vibe `texture` value to the speckle tier to render, or `null` when no
 * texture should be painted (`'none'` or unset). Keeps the texture vocabulary in
 * one place so the renderer doesn't hard-code the mapping.
 */
export function speckleTierFor(texture: string | undefined): SpeckleTier | null {
  switch (texture) {
    case 'paper':
    case 'paper-medium':
      return 'medium';
    case 'paper-subtle':
      return 'subtle';
    default:
      return null;
  }
}

/** Whether a `#rrggbb` colour is dark, so specks can be tinted for contrast. */
export function isDarkColor(hex: string | undefined): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}
