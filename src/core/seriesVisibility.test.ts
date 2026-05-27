import { describe, expect, it } from 'vitest';
import { markKey, toggleSelection } from './seriesVisibility';

describe('markKey', () => {
  it('combines series + index, blank series for single-series', () => {
    expect(markKey({ index: 2 })).toBe(':2');
    expect(markKey({ series: 's1', index: 0 })).toBe('s1:0');
  });
});

describe('toggleSelection', () => {
  it('single-select replaces the set', () => {
    expect([...toggleSelection(new Set(['a']), 'b', false)]).toEqual(['b']);
  });
  it('single-select clicking the sole selection clears it', () => {
    expect([...toggleSelection(new Set(['b']), 'b', false)]).toEqual([]);
  });
  it('multi-select toggles membership', () => {
    expect([...toggleSelection(new Set(['a']), 'b', true)].sort()).toEqual(['a', 'b']);
    expect([...toggleSelection(new Set(['a', 'b']), 'b', true)]).toEqual(['a']);
  });
});
