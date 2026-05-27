import { describe, expect, it } from 'vitest';
import { lerp, interpolateNumberMap, easeInOutCubic } from './transition';

describe('transition interpolation', () => {
  it('lerp blends two numbers', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('interpolateNumberMap blends matching keys', () => {
    expect(interpolateNumberMap({ a: 0, b: 10 }, { a: 10, b: 20 }, 0.5)).toEqual({ a: 5, b: 15 });
  });

  it('interpolateNumberMap falls back to the target for keys absent in `from`', () => {
    expect(interpolateNumberMap({ a: 0 }, { a: 10, b: 8 }, 0.5)).toEqual({ a: 5, b: 8 });
  });

  it('easeInOutCubic pins the endpoints and passes through the midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });
});
