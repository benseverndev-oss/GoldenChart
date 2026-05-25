import type { Margin } from '../types/geometry';

/**
 * Headless text metrics. The MCP server renders via `renderToStaticMarkup` with
 * no canvas/DOM, so measurement is analytic: a per-character em-width table
 * (approximating a proportional sans-serif) scaled by font size. An
 * approximation, but deterministic and identical across the library and the
 * headless build.
 */

const NARROW = new Set("iIl|.,:;'!ij".split(''));
const THIN = new Set("ftr()[]{}/\\-".split(''));
const WIDE = new Set('mwMW@'.split(''));
const UPPER = /[A-Z]/;

/** Approximate advance width of a single character, in em (relative to fontSize). */
function charEm(ch: string): number {
  if (ch === ' ') return 0.3;
  if (NARROW.has(ch)) return 0.28;
  if (THIN.has(ch)) return 0.36;
  if (WIDE.has(ch)) return 0.85;
  if (UPPER.test(ch)) return 0.66;
  return 0.5;
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
