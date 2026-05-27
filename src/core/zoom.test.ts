import { describe, expect, it } from 'vitest';
import { zoomDomain, panDomain, clampDomain, wheelFactor, wheelZoom, focusFraction } from './zoom';

describe('zoom math', () => {
  it('zoomDomain narrows around a centre focus (factor < 1 zooms in)', () => {
    expect(zoomDomain([0, 100], 0.5, 0.5)).toEqual([25, 75]);
  });

  it('zoomDomain keeps a left-edge focus stationary', () => {
    expect(zoomDomain([0, 100], 0, 0.5)).toEqual([0, 50]);
  });

  it('zoomDomain widens when factor > 1 (zoom out)', () => {
    expect(zoomDomain([25, 75], 0.5, 2)).toEqual([0, 100]);
  });

  it('panDomain shifts by a data delta', () => {
    expect(panDomain([0, 100], 10)).toEqual([10, 110]);
  });

  it('clampDomain caps the span to the bounds', () => {
    expect(clampDomain([-10, 110], [0, 100], 5)).toEqual([0, 100]);
  });

  it('clampDomain enforces a minimum span', () => {
    expect(clampDomain([40, 42], [0, 100], 10)).toEqual([40, 50]);
  });

  it('clampDomain slides an over-far domain back inside bounds', () => {
    expect(clampDomain([90, 130], [0, 100], 10)).toEqual([60, 100]);
  });

  it('wheelFactor zooms in on scroll-up and is reciprocal across a notch', () => {
    expect(wheelFactor(-1)).toBeLessThan(1);
    expect(wheelFactor(1)).toBeGreaterThan(1);
    expect(wheelFactor(-1) * wheelFactor(1)).toBeCloseTo(1, 10);
  });

  it('wheelZoom narrows the domain on scroll-up around the focus, clamped', () => {
    // focus centre, scroll up (zoom in) -> [10,90]
    expect(wheelZoom([0, 100], 0.5, -1, [0, 100], 10)).toEqual([10, 90]);
  });

  it('wheelZoom never escapes the bounds', () => {
    const [lo, hi] = wheelZoom([0, 100], 0.5, 1, [0, 100], 10); // zoom out past bounds
    expect(lo).toBe(0);
    expect(hi).toBe(100);
  });

  it('focusFraction maps a pointer position across an element and clamps', () => {
    expect(focusFraction(150, 100, 200)).toBeCloseTo(0.25, 10);
    expect(focusFraction(50, 100, 200)).toBe(0); // left of the element
    expect(focusFraction(400, 100, 200)).toBe(1); // right of the element
  });
});
