import { describe, expect, it } from 'vitest';
import { extentOf } from './scales';

describe('extentOf', () => {
  it('falls back to [0, 1] for an empty series', () => {
    expect(extentOf([])).toEqual([0, 1]);
  });

  it('includes zero by default', () => {
    expect(extentOf([3, 8])).toEqual([0, 8]);
  });

  it('omits the zero baseline when includeZero is false', () => {
    expect(extentOf([3, 8], false)).toEqual([3, 8]);
  });

  it('widens a flat series so min !== max', () => {
    expect(extentOf([5, 5], false)).toEqual([5, 6]);
  });

  it('ignores NaN values rather than poisoning the extent', () => {
    expect(extentOf([1, NaN, 3])).toEqual([0, 3]);
  });

  it('ignores Infinity values', () => {
    expect(extentOf([5, Infinity, -Infinity], false)).toEqual([5, 6]);
  });

  it('falls back to [0, 1] when every value is non-finite', () => {
    expect(extentOf([NaN, Infinity])).toEqual([0, 1]);
  });
});
