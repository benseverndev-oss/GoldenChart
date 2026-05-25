import { describe, expect, it } from 'vitest';
import {
  COLOR_SCALE_NAMES,
  colorRamp,
  divergingColor,
  interpolateRamp,
  ordinalColor,
  sequentialColor,
} from './colorScales';

describe('color scales', () => {
  it('interpolateRamp hits the endpoints exactly', () => {
    expect(interpolateRamp(['#000000', '#ffffff'], 0)).toBe('#000000');
    expect(interpolateRamp(['#000000', '#ffffff'], 1)).toBe('#ffffff');
    expect(interpolateRamp(['#000000', '#ffffff'], 0.5)).toBe('#808080');
  });

  it('clamps out-of-range t', () => {
    expect(interpolateRamp(['#000000', '#ffffff'], -2)).toBe('#000000');
    expect(interpolateRamp(['#000000', '#ffffff'], 5)).toBe('#ffffff');
  });

  it('sequentialColor maps a domain onto the ramp', () => {
    const c = sequentialColor('blues', [0, 100]);
    expect(c(0)).toBe('#f7fbff');
    expect(c(100)).toBe('#08306b');
    expect(c(50)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('divergingColor centers on the midpoint', () => {
    const c = divergingColor('rdbu', [-1, 0, 1]);
    expect(c(0)).toBe('#f7f7f7'); // middle stop
    expect(c(-1)).toBe('#b2182b');
    expect(c(1)).toBe('#2166ac');
  });

  it('ordinalColor is stable and cycles', () => {
    const c = ordinalColor(['a', 'b', 'c']);
    expect(c('a')).toBe(c('a'));
    expect(c('a')).not.toBe(c('b'));
  });

  it('colorRamp samples evenly with endpoints', () => {
    const ramp = colorRamp('viridis', 5);
    expect(ramp).toHaveLength(5);
    expect(ramp[0]).toBe('#440154');
    expect(ramp[4]).toBe('#fde725');
  });

  it('exposes the available scale names', () => {
    expect(COLOR_SCALE_NAMES).toContain('viridis');
    expect(COLOR_SCALE_NAMES).toContain('rdbu');
  });
});
