import { describe, expect, it } from 'vitest';
import { lerp, interpolateNumberMap, easeInOutCubic, interpolateChartData } from './transition';

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

  it('interpolateChartData blends {label,value}[] by matching label', () => {
    const from = [{ label: 'A', value: 0 }, { label: 'B', value: 10 }];
    const to = [{ label: 'A', value: 10 }, { label: 'B', value: 20 }];
    expect(interpolateChartData(from, to, 0.5)).toEqual([
      { label: 'A', value: 5 },
      { label: 'B', value: 15 },
    ]);
  });

  it('interpolateChartData snaps an entering datum (no match in `from`)', () => {
    const out = interpolateChartData([{ label: 'A', value: 0 }], [{ label: 'A', value: 10 }, { label: 'C', value: 8 }], 0.5);
    expect(out).toEqual([{ label: 'A', value: 5 }, { label: 'C', value: 8 }]);
  });

  it('interpolateChartData blends {id,points}[] by id + point index', () => {
    const from = [{ id: 's', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }];
    const to = [{ id: 's', points: [{ x: 0, y: 10 }, { x: 1, y: 20 }] }];
    expect(interpolateChartData(from, to, 0.5)).toEqual([
      { id: 's', points: [{ x: 0, y: 5 }, { x: 1, y: 10 }] },
    ]);
  });

  it('interpolateChartData passes unknown shapes through as `to`', () => {
    expect(interpolateChartData(42, [{ foo: 1 }], 0.5)).toEqual([{ foo: 1 }]);
  });
});
