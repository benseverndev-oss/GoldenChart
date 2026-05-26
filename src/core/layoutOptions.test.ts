import { describe, expect, it } from 'vitest';
import { architectureLayout } from './architecture';
import { layoutFlow } from './dag';
import type { FlowNode, FlowEdge, LayoutOptions } from '../types/charts';

const size: [number, number] = [500, 500];

describe('architecture LayoutOptions', () => {
  const twoBands: FlowNode[] = [
    { id: 'a', label: 'A', group: 'One' },
    { id: 'b', label: 'B', group: 'Two' },
  ];
  const edges: FlowEdge[] = [{ from: 'a', to: 'b' }];

  const bandGap = (opts?: LayoutOptions) => {
    const scene = architectureLayout('TB', opts)(twoBands, edges, size);
    const a = scene.nodes.find((n) => n.id === 'a')!;
    const b = scene.nodes.find((n) => n.id === 'b')!;
    return Math.abs(a.y - b.y);
  };

  it('density presets scale the gap between bands', () => {
    const compact = bandGap({ density: 'compact' });
    const cozy = bandGap({ density: 'cozy' });
    const comfortable = bandGap({ density: 'comfortable' });
    expect(compact).toBeLessThan(cozy);
    expect(comfortable).toBeGreaterThan(cozy);
  });

  it('defaults are stable: undefined and {} produce identical output', () => {
    const a = architectureLayout('TB')(twoBands, edges, size);
    const b = architectureLayout('TB', {})(twoBands, edges, size);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // cozy is the default multiplier (1×), so an explicit cozy matches too.
    expect(bandGap(undefined)).toBe(bandGap({ density: 'cozy' }));
  });

  it('explicit rankSpacing overrides density', () => {
    expect(bandGap({ rankSpacing: 200 })).toBeGreaterThan(bandGap({ rankSpacing: 20 }));
  });

  it('nodeSpacing widens members within a band', () => {
    const members: FlowNode[] = [
      { id: 'a', label: 'A', group: 'G' },
      { id: 'b', label: 'B', group: 'G' },
    ];
    const spread = (gap: number) => {
      const scene = architectureLayout('TB', { nodeSpacing: gap })(members, [], size);
      const a = scene.nodes.find((n) => n.id === 'a')!;
      const b = scene.nodes.find((n) => n.id === 'b')!;
      return Math.abs(a.x - b.x);
    };
    expect(spread(120)).toBeGreaterThan(spread(20));
  });

  it('laneGutter widens the lane container', () => {
    const width = (gutter: number) => {
      const scene = architectureLayout('TB', { laneGutter: gutter })(twoBands, edges, size);
      return scene.groups![0].width;
    };
    expect(width(80)).toBeGreaterThan(width(0));
  });
});

describe('layoutFlow engine override', () => {
  const tree: FlowNode[] = [
    { id: 'r', label: 'R' },
    { id: 'c1', label: 'C1', parent: 'r' },
    { id: 'c2', label: 'C2', parent: 'r' },
  ];

  it('forces the DAG engine, giving a different layout than the tidy tree', () => {
    const auto = layoutFlow(tree, size, undefined, 'TB', 'auto');
    const dag = layoutFlow(tree, size, undefined, 'TB', 'dag');
    const coords = (l: typeof auto) => JSON.stringify(l.nodes.map((n) => [Math.round(n.x), Math.round(n.y)]));
    expect(coords(auto)).not.toBe(coords(dag));
  });

  it('falls back to DAG (no crash) when tree is forced on a merge graph', () => {
    const merge: FlowNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const mEdges: FlowEdge[] = [
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
    ];
    expect(() => layoutFlow(merge, size, mEdges, 'TB', 'tree')).not.toThrow();
  });
});
