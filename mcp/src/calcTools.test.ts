import { describe, expect, it } from 'vitest';
import { calcTools } from './calcTools';

const byName = (name: string) => calcTools.find((t) => t.name === name)!;

describe('calculation tools', () => {
  it('compute_scale returns ticks for a linear scale', async () => {
    const res = await byName('compute_scale').handler({
      type: 'linear',
      numericDomain: [0, 10],
      range: [0, 100],
    });
    const payload = res.structuredContent as { ticks: { value: number; offset: number }[] };
    const zero = payload.ticks.find((t) => t.value === 0);
    expect(zero?.offset).toBe(0);
  });

  it('compute_scale returns bandwidth for a band scale', async () => {
    const res = await byName('compute_scale').handler({
      type: 'band',
      categoryDomain: ['a', 'b'],
      range: [0, 100],
      padding: 0,
    });
    const payload = res.structuredContent as { bandwidth: number };
    expect(payload.bandwidth).toBeCloseTo(50, 5);
  });

  it('compute_line_path returns a path string', async () => {
    const res = await byName('compute_line_path').handler({
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    });
    expect((res.structuredContent as { d: string }).d.startsWith('M')).toBe(true);
  });

  it('compute_pie covers a full circle', async () => {
    const res = await byName('compute_pie').handler({
      data: [
        { label: 'a', value: 1 },
        { label: 'b', value: 1 },
      ],
      outerRadius: 50,
    });
    const { slices } = res.structuredContent as { slices: { startAngle: number; endAngle: number }[] };
    expect(slices).toHaveLength(2);
    expect(slices[1].endAngle - slices[0].startAngle).toBeCloseTo(Math.PI * 2, 5);
  });

  it('layout_tree places a child away from the root (LR)', async () => {
    const res = await byName('layout_tree').handler({
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B', parent: 'a' },
      ],
      width: 200,
      height: 100,
      direction: 'LR',
    });
    const { nodes } = res.structuredContent as { nodes: { id: string; x: number }[] };
    const root = nodes.find((n) => n.id === 'a')!;
    const child = nodes.find((n) => n.id === 'b')!;
    expect(root.x).toBeLessThan(child.x);
  });

  it('compute_scale throws without the right domain', async () => {
    await expect(byName('compute_scale').handler({ type: 'linear', range: [0, 100] })).rejects.toThrow();
  });
});
