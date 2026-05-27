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

// "medium" tier — chosen against the live before/after comparison.
const DENSITY_DIVISOR = 550; // one speck per ~550 px²
const R_MIN = 0.5;
const R_MAX = 1.0;
const O_MIN = 0.05;
const O_MAX = 0.13;

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

export function paperSpeckles(width: number, height: number, seed: number): Speck[] {
  if (width <= 0 || height <= 0) return [];
  const rand = mulberry32(seed);
  const count = Math.round((width * height) / DENSITY_DIVISOR);
  const specks: Speck[] = [];
  for (let i = 0; i < count; i++) {
    specks.push({
      cx: round(rand() * width),
      cy: round(rand() * height),
      r: round(R_MIN + rand() * (R_MAX - R_MIN), 2),
      opacity: round(O_MIN + rand() * (O_MAX - O_MIN), 3),
    });
  }
  return specks;
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
