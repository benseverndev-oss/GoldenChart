import { describe, expect, it } from 'vitest';
import { arrowHeadPath, diamondPath, ellipsePath, linePath, linkPath } from './shapes';

describe('shape path generators', () => {
  it('linePath builds a path through points', () => {
    const d = linePath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(d.startsWith('M')).toBe(true);
  });

  it('linePath returns empty string for no points', () => {
    expect(linePath([])).toBe('');
  });

  it('linkPath bows along the chosen axis', () => {
    const v = linkPath({ x: 0, y: 0 }, { x: 0, y: 100 }, 'vertical');
    const h = linkPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 'horizontal');
    expect(v).not.toBe(h);
    expect(v.includes('C')).toBe(true);
  });

  it('diamondPath and ellipsePath are closed paths', () => {
    expect(diamondPath(50, 50, 40, 20).endsWith('Z')).toBe(true);
    expect(ellipsePath(50, 50, 20, 10).endsWith('Z')).toBe(true);
  });

  it('arrowHeadPath produces a two-segment head ending at the tip', () => {
    const d = arrowHeadPath({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(d).toContain('L10,0');
  });
});
