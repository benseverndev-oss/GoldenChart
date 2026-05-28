import { describe, expect, it } from 'vitest';
import { markAttrs } from './interaction';

describe('markAttrs', () => {
  it('serializes a single-value mark', () => {
    expect(markAttrs({ kind: 'bar', index: 2, label: 'Q3', value: 7, cx: 100, cy: 40 })).toEqual({
      'data-gc-mark': 'bar',
      'data-gc-index': '2',
      'data-gc-label': 'Q3',
      'data-gc-value': '7',
      'data-gc-cx': '100',
      'data-gc-cy': '40',
    });
  });

  it('includes series when present and JSON-encodes multi-value', () => {
    const attrs = markAttrs({
      kind: 'point',
      series: 'revenue',
      index: 0,
      value: { x: 1, y: 2 },
      cx: 5,
      cy: 6,
    });
    expect(attrs['data-gc-series']).toBe('revenue');
    expect(attrs['data-gc-value']).toBe('{"x":1,"y":2}');
    expect(attrs['data-gc-label']).toBeUndefined();
  });
});
