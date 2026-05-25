import { describe, expect, it } from 'vitest';
import { axisAngle, polarToCartesian, polygonPath } from './polar';

describe('polar helpers', () => {
  it('polarToCartesian maps radius/angle to a point', () => {
    const p = polarToCartesian(0, 0, 10, 0);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(0);
  });

  it('axisAngle starts at the top (-90deg) and wraps clockwise', () => {
    expect(axisAngle(0, 4)).toBeCloseTo(-Math.PI / 2);
    expect(axisAngle(1, 4)).toBeCloseTo(0);
    expect(axisAngle(2, 4)).toBeCloseTo(Math.PI / 2);
  });

  it('first axis sits directly above center', () => {
    const p = polarToCartesian(50, 50, 20, axisAngle(0, 5));
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(30);
  });

  it('polygonPath is closed', () => {
    const d = polygonPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 8 }]);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('polygonPath is empty for no points', () => {
    expect(polygonPath([])).toBe('');
  });
});
