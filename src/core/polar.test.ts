import { describe, expect, it } from 'vitest';
import {
  axisAngle,
  polarToCartesian,
  polygonPath,
  regularPolygonPath,
  starPath,
  arcStrokePath,
  wedgePath,
} from './polar';

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

  it('regularPolygonPath builds a closed n-gon with one vertex per side', () => {
    const d = regularPolygonPath(50, 50, 20, 6);
    expect(d.startsWith('M50,30')).toBe(true); // rotation 0 => first vertex at top
    expect(d.endsWith('Z')).toBe(true);
    expect(d.split('L')).toHaveLength(6); // 6 vertices => M + 5 L
  });

  it('regularPolygonPath rotates vertices clockwise by rotationRad', () => {
    const d = regularPolygonPath(50, 50, 20, 4, Math.PI / 2); // top + 90deg => east
    expect(d.startsWith('M70,50')).toBe(true);
  });

  it('starPath alternates outer/inner radii over 2*points vertices', () => {
    const d = starPath(50, 50, 20, 10, 5);
    expect(d.startsWith('M50,30')).toBe(true); // first (outer) vertex at top
    expect(d.endsWith('Z')).toBe(true);
    expect(d.split('L')).toHaveLength(10); // 10 vertices
  });

  it('arcStrokePath is an open arc using the SVG A command', () => {
    const d = arcStrokePath(50, 50, 20, 0, Math.PI / 2);
    expect(d.startsWith('M70,50')).toBe(true); // start at east (0 = east for arcs)
    expect(d).toContain('A');
    expect(d.endsWith('Z')).toBe(false); // open, not closed
  });

  it('arcStrokePath uses the short arc for a wrapped span and the large-arc flag past 180deg', () => {
    // 340deg -> 20deg is a 40deg forward arc despite end < start: large-arc flag 0
    const wrapped = arcStrokePath(50, 50, 20, (340 * Math.PI) / 180, (20 * Math.PI) / 180);
    expect(wrapped).toContain(' 0,1 ');
    // a 270deg arc is past 180deg: large-arc flag 1
    const big = arcStrokePath(50, 50, 20, 0, (270 * Math.PI) / 180);
    expect(big).toContain(' 1,1 ');
  });

  it('wedgePath is a closed pie slice from the center', () => {
    const d = wedgePath(50, 50, 20, 0, Math.PI / 2);
    expect(d.startsWith('M50,50')).toBe(true); // starts at the center
    expect(d).toContain('A');
    expect(d.endsWith('Z')).toBe(true);
    expect((d.match(/A/g) ?? []).length).toBe(1); // one arc
  });

  it('wedgePath with innerR is a closed annular wedge with two arcs', () => {
    const d = wedgePath(50, 50, 20, 0, Math.PI / 2, 10);
    expect(d.endsWith('Z')).toBe(true);
    expect((d.match(/A/g) ?? []).length).toBe(2); // outer + inner arc
  });
});
