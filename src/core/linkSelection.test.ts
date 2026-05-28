import { describe, expect, it } from 'vitest';
import { emptyLink, setFilter, clearFilter, activeFilter } from './linkSelection';
import type { LinkState } from './linkSelection';

describe('linked-selection reducer', () => {
  it('starts empty with no active filter', () => {
    expect(activeFilter(emptyLink())).toEqual([]);
  });

  it("setFilter records a source chart's selected keys", () => {
    const s = setFilter(emptyLink(), 'chartA', ['a', 'b']);
    expect(activeFilter(s)).toEqual(['a', 'b']);
  });

  it('merges filters from multiple sources (union, deduped, sorted)', () => {
    let s: LinkState = emptyLink();
    s = setFilter(s, 'chartA', ['b', 'a']);
    s = setFilter(s, 'chartB', ['a', 'c']);
    expect(activeFilter(s)).toEqual(['a', 'b', 'c']);
  });

  it('clearFilter removes a source and re-merges the rest', () => {
    let s: LinkState = emptyLink();
    s = setFilter(s, 'chartA', ['a']);
    s = setFilter(s, 'chartB', ['b']);
    s = clearFilter(s, 'chartA');
    expect(activeFilter(s)).toEqual(['b']);
  });

  it('setFilter with an empty list clears that source', () => {
    let s: LinkState = setFilter(emptyLink(), 'chartA', ['a']);
    s = setFilter(s, 'chartA', []);
    expect(activeFilter(s)).toEqual([]);
  });
});
