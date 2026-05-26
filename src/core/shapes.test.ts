import { describe, expect, it } from 'vitest';
import {
  arrowHeadPath,
  connectorPath,
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

describe('connectorPath', () => {
  it('straight: line d, end tail at from, start tail at to, label at midpoint', () => {
    const c = connectorPath({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(c.d).toBe('M0,0 L100,0');
    expect(c.endHeadTail).toEqual({ x: 0, y: 0 });
    expect(c.startHeadTail).toEqual({ x: 100, y: 0 });
    expect(c.labelAt).toEqual({ x: 50, y: 0 });
  });

  it('curved: d contains a cubic', () => {
    const c = connectorPath({ x: 0, y: 0 }, { x: 0, y: 100 }, { routing: 'curved' });
    expect(c.d).toContain('C');
  });

  it('orthogonal: multi-segment d, end tail axis-aligned with to, label on the mid-segment', () => {
    const c = connectorPath({ x: 0, y: 0 }, { x: 40, y: 100 }, { routing: 'orthogonal' });
    expect(c.d.split('L').length).toBeGreaterThan(2);
    expect(c.endHeadTail.x === 40 || c.endHeadTail.y === 100).toBe(true);
    // points = [{0,0},{0,50},{40,50},{40,100}] => mid-segment midpoint is {20,50}, not the elbow
    expect(c.labelAt).toEqual({ x: 20, y: 50 });
  });

  it('infers horizontal orientation from a wide-but-short delta', () => {
    // |dx| >= |dy| => horizontal => orthogonal elbow departs along x (shares from.y)
    const c = connectorPath({ x: 0, y: 0 }, { x: 100, y: 20 }, { routing: 'orthogonal' });
    expect(c.startHeadTail.y).toBe(0);
  });

  it('handles from == to without throwing', () => {
    const c = connectorPath({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(c.d).toBe('M5,5 L5,5');
    expect(c.endHeadTail).toEqual({ x: 5, y: 5 });
  });

  it('orthogonal with a shared axis does not throw and defines the tails', () => {
    const c = connectorPath({ x: 10, y: 0 }, { x: 10, y: 80 }, { routing: 'orthogonal' });
    expect(typeof c.d).toBe('string');
    expect(c.endHeadTail).toBeDefined();
    expect(c.startHeadTail).toBeDefined();
  });
});
