import { describe, expect, it } from 'vitest';
import { zoomDomain, panDomain, clampDomain } from './zoom';

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
});
