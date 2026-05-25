import { describe, expect, it } from 'vitest';
import { computeTreemap } from './treemap';
import type { TreemapDatum } from './treemap';

const data: TreemapDatum[] = [
  { id: 'root', label: 'Root' },
  { id: 'a', parent: 'root', value: 3, label: 'A' },
  { id: 'b', parent: 'root', value: 1, label: 'B' },
];

describe('computeTreemap', () => {
  it('returns no leaves for empty input', () => {
    expect(computeTreemap([], [100, 100])).toEqual([]);
  });

  it('produces a leaf rect per leaf node, sized by value', () => {
    const leaves = computeTreemap(data, [100, 100]);
    expect(leaves).toHaveLength(2);
    const a = leaves.find((l) => l.id === 'a')!;
    const b = leaves.find((l) => l.id === 'b')!;
    const areaA = (a.x1 - a.x0) * (a.y1 - a.y0);
    const areaB = (b.x1 - b.x0) * (b.y1 - b.y0);
    expect(areaA).toBeGreaterThan(areaB);
  });

  it('fills the full extent', () => {
    const leaves = computeTreemap(data, [200, 120]);
    const maxX = Math.max(...leaves.map((l) => l.x1));
    const maxY = Math.max(...leaves.map((l) => l.y1));
    expect(maxX).toBeCloseTo(200, 0);
    expect(maxY).toBeCloseTo(120, 0);
  });

  it('tags each leaf with its top-level group', () => {
    const nested: TreemapDatum[] = [
      { id: 'root' },
      { id: 'g1', parent: 'root' },
      { id: 'g2', parent: 'root' },
      { id: 'x', parent: 'g1', value: 2 },
      { id: 'y', parent: 'g2', value: 2 },
    ];
    const leaves = computeTreemap(nested, [100, 100]);
    expect(leaves.find((l) => l.id === 'x')!.groupId).toBe('g1');
    expect(leaves.find((l) => l.id === 'y')!.groupId).toBe('g2');
  });
});
