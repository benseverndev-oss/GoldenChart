import { describe, expect, it } from 'vitest';
import { defaultTooltipFormat } from './defaultTooltipFormat';

describe('defaultTooltipFormat', () => {
  it('uses the label as title and value as a single row', () => {
    expect(defaultTooltipFormat({ kind: 'bar', index: 0, label: 'Q1', value: 12, cx: 0, cy: 0 })).toEqual({
      title: 'Q1',
      rows: [['value', '12']],
    });
  });

  it('expands a multi-value mark into one row per key', () => {
    const out = defaultTooltipFormat({ kind: 'point', series: 's1', index: 2, value: { x: 1, y: 3 }, cx: 0, cy: 0 });
    expect(out.title).toBe('s1');
    expect(out.rows).toEqual([['x', '1'], ['y', '3']]);
  });
});
