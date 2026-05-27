import { describe, expect, it } from 'vitest';
import { boxEdgePoint } from './shapes';

const C = { x: 0, y: 0 };
describe('boxEdgePoint', () => {
  it('exits the right edge for a horizontal target', () => {
    expect(boxEdgePoint(C, 100, 50, { x: 200, y: 0 })).toEqual({ x: 50, y: 0 });
  });
  it('exits the bottom edge for a vertical target', () => {
    expect(boxEdgePoint(C, 100, 50, { x: 0, y: 200 })).toEqual({ x: 0, y: 25 });
  });
  it('exits a side (not a corner) on a diagonal, staying on the border', () => {
    const p = boxEdgePoint(C, 100, 50, { x: 200, y: 200 });
    // limiting axis is y (hh=25 reached first): point sits on the bottom edge.
    expect(p.y).toBeCloseTo(25);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(50);
  });
  it('returns the centre when target == centre', () => {
    expect(boxEdgePoint(C, 100, 50, C)).toEqual({ x: 0, y: 0 });
  });
});
