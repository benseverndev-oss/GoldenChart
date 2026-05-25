import { describe, expect, it } from 'vitest';
import { routeOrthogonal, type Obstacle } from './routing';
import type { Point } from '../types/geometry';

const orthogonal = (pts: Point[]) =>
  pts.slice(1).every((p, i) => p.x === pts[i].x || p.y === pts[i].y);

const crossesInterior = (pts: Point[], o: Obstacle, pad: number) => {
  const x0 = o.x - pad;
  const y0 = o.y - pad;
  const x1 = o.x + o.width + pad;
  const y1 = o.y + o.height + pad;
  return pts.slice(1).some((q, i) => {
    const p = pts[i];
    if (p.y === q.y) {
      const a = Math.min(p.x, q.x);
      const b = Math.max(p.x, q.x);
      return p.y > y0 && p.y < y1 && a < x1 && b > x0;
    }
    const a = Math.min(p.y, q.y);
    const b = Math.max(p.y, q.y);
    return p.x > x0 && p.x < x1 && a < y1 && b > y0;
  });
};

describe('routeOrthogonal', () => {
  it('runs straight when nothing is in the way', () => {
    const path = routeOrthogonal({ x: 0, y: 50 }, { x: 200, y: 50 }, []);
    expect(path).toEqual([
      { x: 0, y: 50 },
      { x: 200, y: 50 },
    ]);
  });

  it('detours around an obstacle with axis-aligned segments only', () => {
    const box: Obstacle = { x: 80, y: 30, width: 40, height: 40 };
    const path = routeOrthogonal({ x: 0, y: 50 }, { x: 200, y: 50 }, [box], { padding: 10 });
    expect(path[0]).toEqual({ x: 0, y: 50 });
    expect(path[path.length - 1]).toEqual({ x: 200, y: 50 });
    expect(orthogonal(path)).toBe(true);
    // It actually went around rather than straight through.
    expect(path.length).toBeGreaterThan(2);
    expect(crossesInterior(path, box, 10)).toBe(false);
  });

  it('keeps endpoints exact and stays orthogonal with several obstacles', () => {
    const obstacles: Obstacle[] = [
      { x: 60, y: 0, width: 30, height: 60 },
      { x: 60, y: 90, width: 30, height: 60 },
    ];
    const path = routeOrthogonal({ x: 0, y: 75 }, { x: 160, y: 75 }, obstacles, { padding: 8 });
    expect(path[0]).toEqual({ x: 0, y: 75 });
    expect(path[path.length - 1]).toEqual({ x: 160, y: 75 });
    expect(orthogonal(path)).toBe(true);
    obstacles.forEach((o) => expect(crossesInterior(path, o, 8)).toBe(false));
  });
});
