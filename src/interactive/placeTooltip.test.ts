import { describe, expect, it } from 'vitest';
import { placeTooltip } from './placeTooltip';

const bounds = { width: 200, height: 140 };
const size = { width: 60, height: 30 };

describe('placeTooltip', () => {
  it('places below-right of the anchor by default', () => {
    expect(placeTooltip({ x: 20, y: 20 }, size, bounds, 8)).toEqual({ x: 28, y: 28 });
  });

  it('flips left when it would overflow the right edge', () => {
    const p = placeTooltip({ x: 180, y: 20 }, size, bounds, 8);
    expect(p.x).toBe(180 - 8 - 60);
  });

  it('flips above when it would overflow the bottom edge', () => {
    const p = placeTooltip({ x: 20, y: 130 }, size, bounds, 8);
    expect(p.y).toBe(130 - 8 - 30);
  });

  it('clamps to >= 0 when flipping would push it off the near edge', () => {
    const p = placeTooltip({ x: 2, y: 2 }, { width: 60, height: 30 }, bounds, 8);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeGreaterThanOrEqual(0);
  });
});
