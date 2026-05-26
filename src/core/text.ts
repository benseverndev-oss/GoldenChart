import type { Margin } from '../types/geometry';

/**
 * Headless text metrics. The MCP server renders via `renderToStaticMarkup` with
 * no canvas/DOM, so measurement is analytic: a per-character em-width table
 * (approximating a proportional sans-serif) scaled by font size. An
 * approximation, but deterministic and identical across the library and the
 * headless build.
 */

/**
 * Per-glyph advance widths for Helvetica (Adobe AFM, 1000 units/em). Treating
 * every proportional sans-serif as Helvetica-metric is a far better analytic
 * estimate than coarse width buckets, and stays deterministic and DOM-free —
 * the headless build has no canvas to measure with.
 */
const HELVETICA_1000: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
  ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  '{': 334, '|': 260, '}': 334, '~': 584,
};

/** Advance width of a single character, in em (relative to fontSize). */
function charEm(ch: string): number {
  return (HELVETICA_1000[ch] ?? 556) / 1000;
}

function familyFactor(fontFamily: string): { fixed: number | null; scale: number } {
  const f = fontFamily.toLowerCase();
  if (f.includes('mono') || f.includes('courier')) return { fixed: 0.6, scale: 1 };
  if (f.includes('comic') || f.includes('print') || f.includes('cursive')) return { fixed: null, scale: 1.08 };
  return { fixed: null, scale: 1 };
}

/** Estimate the rendered size of a single line of text. */
export function measureText(text: string, fontSize: number, fontFamily: string): { width: number; height: number } {
  const { fixed, scale } = familyFactor(fontFamily);
  let em = 0;
  for (const ch of text) em += fixed ?? charEm(ch);
  return { width: em * fontSize * scale, height: fontSize * 1.2 };
}

/** Greedy word-wrap to a pixel width; hard-breaks any single word that overflows. */
export function wrapText(text: string, maxWidth: number, fontSize: number, fontFamily: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = '';

  const fits = (s: string) => measureText(s, fontSize, fontFamily).width <= maxWidth;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate) || !line) {
      if (fits(candidate)) {
        line = candidate;
        continue;
      }
      // `word` alone overflows an empty line: hard-break it by character.
      let chunk = '';
      for (const ch of word) {
        if (chunk && !fits(chunk + ch)) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Grow a base margin so the widest label fits on the left (y-axis tick labels)
 * and a line of text fits along the bottom (x-axis tick labels). Pure helper for
 * charts that want their margins to adapt to their data.
 */
export function autoMargin(
  labels: string[],
  fontSize: number,
  fontFamily: string,
  base: Margin,
  pad = 8,
): Margin {
  const widest = labels.reduce((max, l) => Math.max(max, measureText(l, fontSize, fontFamily).width), 0);
  const lineHeight = fontSize * 1.2;
  return {
    ...base,
    left: Math.max(base.left, Math.ceil(widest + pad)),
    bottom: Math.max(base.bottom, Math.ceil(lineHeight + pad)),
  };
}
