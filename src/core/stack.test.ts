import { describe, expect, it } from 'vitest';
import { groupMax, seriesKeysOf, stackLayout, stackMax } from './stack';
import type { MultiSeriesDatum } from '../types/charts';

const data: MultiSeriesDatum[] = [
  { label: 'Q1', values: { sales: 3, returns: 1 } },
  { label: 'Q2', values: { sales: 5, returns: 2 } },
];

describe('stack helpers', () => {
  it('seriesKeysOf collects keys in first-seen order', () => {
    expect(seriesKeysOf(data)).toEqual(['sales', 'returns']);
  });

  it('stackLayout produces cumulative spans', () => {
    const segs = stackLayout(data, ['sales', 'returns']);
    const q1Returns = segs.find((s) => s.label === 'Q1' && s.key === 'returns')!;
    expect(q1Returns.start).toBe(3);
    expect(q1Returns.end).toBe(4);
  });

  it('stackMax is the largest stacked total', () => {
    expect(stackMax(data, ['sales', 'returns'])).toBe(7); // Q2: 5 + 2
  });

  it('groupMax is the largest single value', () => {
    expect(groupMax(data, ['sales', 'returns'])).toBe(5);
  });

  it('handles missing keys as zero', () => {
    const sparse: MultiSeriesDatum[] = [{ label: 'x', values: { a: 2 } }];
    expect(stackMax(sparse, ['a', 'b'])).toBe(2);
  });
});
