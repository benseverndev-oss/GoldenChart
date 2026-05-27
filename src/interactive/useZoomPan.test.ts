import { describe, expect, it } from 'vitest';
import { chartXExtent } from './useZoomPan';

describe('chartXExtent', () => {
  it('derives the x-extent from point series', () => {
    const props = {
      series: [
        { id: 'a', points: [{ x: 0, y: 1 }, { x: 10, y: 2 }] },
        { id: 'b', points: [{ x: -5, y: 0 }, { x: 4, y: 9 }] },
      ],
    };
    expect(chartXExtent(props)).toEqual([-5, 10]);
  });

  it('derives the x-extent from a scatter datum array', () => {
    expect(chartXExtent({ data: [{ x: 2, y: 0 }, { x: 8, y: 0 }] })).toEqual([2, 8]);
  });

  it('returns null for categorical bar data (no continuous x)', () => {
    expect(chartXExtent({ data: [{ label: 'Q1', value: 12 }] })).toBeNull();
  });

  it('returns null when there is no series/data', () => {
    expect(chartXExtent({})).toBeNull();
  });
});
