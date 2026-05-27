import { describe, expect, it } from 'vitest';
import { allFinite, pathIsRenderable } from './roughGenerator';

describe('allFinite', () => {
  it('is true when every argument is a finite number', () => {
    expect(allFinite(0, 1, -2, 3.5)).toBe(true);
  });

  it('is false if any argument is NaN', () => {
    expect(allFinite(1, NaN, 3)).toBe(false);
  });

  it('is false if any argument is ±Infinity', () => {
    expect(allFinite(1, Infinity)).toBe(false);
    expect(allFinite(-Infinity, 1)).toBe(false);
  });

  it('is true with no arguments', () => {
    expect(allFinite()).toBe(true);
  });
});

describe('pathIsRenderable', () => {
  it('accepts an ordinary path string', () => {
    expect(pathIsRenderable('M0,0 L10,10')).toBe(true);
  });

  it('rejects an empty or whitespace path', () => {
    expect(pathIsRenderable('')).toBe(false);
    expect(pathIsRenderable('   ')).toBe(false);
  });

  it('rejects a path carrying NaN or Infinity coordinates', () => {
    expect(pathIsRenderable('M0,0 LNaN,10')).toBe(false);
    expect(pathIsRenderable('M0,0 LInfinity,10')).toBe(false);
  });
});
