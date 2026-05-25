import { describe, expect, it } from 'vitest';
import { computePie } from './arc';

const data = [
  { label: 'a', value: 1 },
  { label: 'b', value: 2 },
  { label: 'c', value: 1 },
];

describe('computePie', () => {
  it('returns one slice per datum with full-circle coverage', () => {
    const slices = computePie(data, 100);
    expect(slices).toHaveLength(3);
    const total = slices[slices.length - 1].endAngle - slices[0].startAngle;
    expect(total).toBeCloseTo(Math.PI * 2, 5);
  });

  it('sizes slices proportionally to value', () => {
    const slices = computePie(data, 100);
    const sweep = (i: number) => slices[i].endAngle - slices[i].startAngle;
    // 'b' has twice the value of 'a', so ~twice the sweep
    expect(sweep(1)).toBeCloseTo(sweep(0) * 2, 5);
  });

  it('emits a path string and a centroid', () => {
    const [slice] = computePie(data, 100, 40);
    expect(slice.path.startsWith('M')).toBe(true);
    expect(slice.centroid).toHaveLength(2);
  });
});
