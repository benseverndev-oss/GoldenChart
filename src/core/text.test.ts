import { describe, expect, it } from 'vitest';
import { autoMargin, measureText, wrapText } from './text';

const SANS = 'sans-serif';

describe('text metrics', () => {
  it('measureText scales with length and font size', () => {
    const a = measureText('hi', 12, SANS);
    const b = measureText('hi there friend', 12, SANS);
    expect(b.width).toBeGreaterThan(a.width);
    expect(measureText('hi', 24, SANS).width).toBeGreaterThan(a.width);
  });

  it('monospace treats every glyph as fixed width', () => {
    const w = measureText('iiii', 12, 'monospace').width;
    const m = measureText('mmmm', 12, 'monospace').width;
    expect(w).toBeCloseTo(m, 5);
  });

  it('wrapText splits to fit a width', () => {
    const lines = wrapText('the quick brown fox jumps', 60, 12, SANS);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measureText(line, 12, SANS).width).toBeLessThanOrEqual(60);
    }
  });

  it('wrapText hard-breaks a single overflowing word', () => {
    const lines = wrapText('supercalifragilistic', 30, 12, SANS);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('wrapText returns empty for blank input', () => {
    expect(wrapText('   ', 100, 12, SANS)).toEqual([]);
  });

  it('autoMargin grows left to fit the widest label, never shrinks', () => {
    const base = { top: 10, right: 10, bottom: 10, left: 20 };
    const grown = autoMargin(['short', 'a very long axis label'], 14, SANS, base);
    expect(grown.left).toBeGreaterThan(base.left);
    expect(grown.right).toBe(base.right);
    expect(autoMargin([], 14, SANS, base).left).toBe(base.left);
  });
});
