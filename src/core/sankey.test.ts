import { describe, expect, it } from 'vitest';
import { computeSankey } from './sankey';

const nodes = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
];

describe('computeSankey', () => {
  it('returns empty layout for no nodes', () => {
    expect(computeSankey([], [], [400, 300])).toEqual({ nodes: [], links: [] });
  });

  it('places downstream nodes in deeper layers (LR ⇒ larger x)', () => {
    const { nodes: laid } = computeSankey(
      nodes,
      [
        { source: 'a', target: 'b', value: 5 },
        { source: 'b', target: 'c', value: 5 },
      ],
      [400, 300],
      { direction: 'LR' },
    );
    const a = laid.find((n) => n.id === 'a')!;
    const b = laid.find((n) => n.id === 'b')!;
    const c = laid.find((n) => n.id === 'c')!;
    expect(b.x).toBeGreaterThan(a.x);
    expect(c.x).toBeGreaterThan(b.x);
  });

  it('sizes nodes proportionally to throughput', () => {
    const { nodes: laid } = computeSankey(
      [
        { id: 'src', label: 'Src' },
        { id: 'big', label: 'Big' },
        { id: 'small', label: 'Small' },
      ],
      [
        { source: 'src', target: 'big', value: 9 },
        { source: 'src', target: 'small', value: 1 },
      ],
      [400, 300],
      { direction: 'LR' },
    );
    const big = laid.find((n) => n.id === 'big')!;
    const small = laid.find((n) => n.id === 'small')!;
    expect(big.height).toBeGreaterThan(small.height);
  });

  it('produces one ribbon path per valid link and drops invalid ones', () => {
    const { links } = computeSankey(
      nodes,
      [
        { source: 'a', target: 'b', value: 4 },
        { source: 'a', target: 'a', value: 2 }, // self-loop dropped
        { source: 'a', target: 'ghost', value: 3 }, // unknown dropped
        { source: 'b', target: 'c', value: 0 }, // zero value dropped
      ],
      [400, 300],
    );
    expect(links).toHaveLength(1);
    expect(links[0].path.startsWith('M')).toBe(true);
  });
});
