import { describe, expect, it } from 'vitest';
import {
  arrowHeadPath,
  diamondPath,
  ellipsePath,
  linePath,
  linkPath,
  orthogonalPath,
  orthogonalPoints,
} from './shapes';

describe('shape path generators', () => {
  it('linePath builds a path through points', () => {
    const d = linePath([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
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

  it('orthogonalPath uses straight elbow segments (no curves)', () => {
    const d = orthogonalPath({ x: 0, y: 0 }, { x: 40, y: 100 }, 'vertical');
    expect(d.startsWith('M0,0')).toBe(true);
    expect(d.includes('C')).toBe(false);
    expect(d.split('L')).toHaveLength(4); // three line segments after the move
  });

  it('orthogonalPoints jogs across the midpoint along the flow axis', () => {
    const v = orthogonalPoints({ x: 0, y: 0 }, { x: 40, y: 100 }, 'vertical');
    // leaves the source vertically, crosses at mid-y, arrives vertically
    expect(v).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 40, y: 50 },
      { x: 40, y: 100 },
    ]);
    const h = orthogonalPoints({ x: 0, y: 0 }, { x: 100, y: 40 }, 'horizontal');
    expect(h).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 40 },
      { x: 100, y: 40 },
    ]);
  });

  it('diamondPath and ellipsePath are closed paths', () => {
    expect(diamondPath(50, 50, 40, 20).endsWith('Z')).toBe(true);
    expect(ellipsePath(50, 50, 20, 10).endsWith('Z')).toBe(true);
  });

  it('arrowHeadPath produces a two-segment head ending at the tip', () => {
    const d = arrowHeadPath({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(d).toContain('L10,0');
  });

  it('arrowHeadPath is open by default and closed when filled', () => {
    const open = arrowHeadPath({ x: 0, y: 0 }, { x: 10, y: 0 });
    const filled = arrowHeadPath({ x: 0, y: 0 }, { x: 10, y: 0 }, 9, true);
    expect(open.endsWith('Z')).toBe(false);
    expect(filled.endsWith('Z')).toBe(true);
    expect(filled).toContain('L10,0'); // still passes through the tip
  });
});
