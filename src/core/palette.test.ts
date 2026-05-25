import { describe, expect, it } from 'vitest';
import { DEFAULT_PALETTE, colorAt } from './palette';

describe('colorAt', () => {
  it('returns palette colors by index', () => {
    expect(colorAt(0)).toBe(DEFAULT_PALETTE[0]);
  });

  it('wraps around past the end', () => {
    expect(colorAt(DEFAULT_PALETTE.length)).toBe(DEFAULT_PALETTE[0]);
  });

  it('handles negative indices without throwing', () => {
    expect(typeof colorAt(-1)).toBe('string');
  });
});
