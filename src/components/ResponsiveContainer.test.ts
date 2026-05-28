import { describe, expect, it } from 'vitest';
import { computeResponsiveSize } from './ResponsiveContainer';

// The React component itself is a thin ResizeObserver wrapper. Project
// convention (see InteractiveChart.test.ts / readMark.test.ts) is to skip
// jsdom and unit-test the pure helper that drives behaviour.
describe('computeResponsiveSize', () => {
  it('derives height from width / aspectRatio when the rect has no height', () => {
    expect(computeResponsiveSize({ width: 400, height: 0 }, { aspectRatio: 2 })).toEqual({
      width: 400,
      height: 200,
    });
  });

  it('uses the observed height when the parent constrains it', () => {
    expect(computeResponsiveSize({ width: 400, height: 250 }, { aspectRatio: 2 })).toEqual({
      width: 400,
      height: 250,
    });
  });

  it('defaults to 16/9 when aspectRatio is omitted', () => {
    const out = computeResponsiveSize({ width: 1600, height: 0 });
    expect(out.width).toBe(1600);
    expect(Math.round(out.height)).toBe(900);
  });

  it('clamps height to maxHeight', () => {
    expect(
      computeResponsiveSize({ width: 1000, height: 0 }, { aspectRatio: 1, maxHeight: 200 }),
    ).toEqual({ width: 1000, height: 200 });
  });

  it('clamps height to minHeight', () => {
    expect(
      computeResponsiveSize({ width: 20, height: 0 }, { aspectRatio: 1, minHeight: 80 }),
    ).toEqual({ width: 20, height: 80 });
  });

  it('clamps width to minWidth', () => {
    expect(computeResponsiveSize({ width: 50, height: 0 }, { minWidth: 200 })).toEqual({
      width: 200,
      height: 200 / (16 / 9),
    });
  });

  it('treats heights of 1 or less as unconstrained (avoids 0-height ResizeObserver noise)', () => {
    expect(computeResponsiveSize({ width: 400, height: 1 }, { aspectRatio: 2 })).toEqual({
      width: 400,
      height: 200,
    });
  });
});
