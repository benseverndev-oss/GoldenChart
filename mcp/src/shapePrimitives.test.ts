import { describe, expect, it } from 'vitest';
import { calcTools } from './calcTools';
import { orchestrationTools } from './orchestrationTools';

/**
 * SP2 — new shape primitives (regular polygon, star, arc, wedge, ellipse,
 * arrowhead) exposed as Level-1 calc tools and compose_surface scene kinds.
 * See docs/superpowers/specs/2026-05-26-new-shape-primitives-design.md.
 */

const calc = (name: string) => {
  const tool = calcTools.find((t) => t.name === name);
  if (!tool) throw new Error(`calc tool not found: ${name}`);
  return tool;
};
const dOf = async (name: string, args: Record<string, unknown>): Promise<string> =>
  ((await calc(name).handler(args)).structuredContent as { d: string }).d;

const compose = orchestrationTools.find((t) => t.name === 'compose_surface')!;
const renderScene = async (node: Record<string, unknown>): Promise<string> =>
  (await compose.handler({ width: 200, height: 200, children: [node] })).content[0].text;

describe('shape calc tools', () => {
  it('compute_regular_polygon_path is closed with one vertex per side', async () => {
    const d = await dOf('compute_regular_polygon_path', { cx: 50, cy: 50, r: 20, sides: 6 });
    expect(d.startsWith('M50,30')).toBe(true); // rotation 0 => first vertex at top
    expect(d.endsWith('Z')).toBe(true);
    expect(d.split('L')).toHaveLength(6);
  });

  it('compute_star_path has 2*points vertices', async () => {
    const d = await dOf('compute_star_path', { cx: 50, cy: 50, outerRadius: 20, innerRadius: 10, points: 5 });
    expect(d.split('L')).toHaveLength(10);
  });

  it('compute_arc_path converts degrees (0=east, 90=south) and stays open', async () => {
    const d = await dOf('compute_arc_path', { cx: 50, cy: 50, r: 20, startAngle: 0, endAngle: 90 });
    expect(d.startsWith('M70,50')).toBe(true); // 0deg = east
    expect(d).toContain('A');
    expect(d.endsWith('Z')).toBe(false);
  });

  it('compute_wedge_path is closed; annular has two arcs', async () => {
    const slice = await dOf('compute_wedge_path', { cx: 50, cy: 50, r: 20, startAngle: 0, endAngle: 90 });
    expect(slice.endsWith('Z')).toBe(true);
    expect((slice.match(/A/g) ?? []).length).toBe(1);
    const annular = await dOf('compute_wedge_path', { cx: 50, cy: 50, r: 20, startAngle: 0, endAngle: 90, innerRadius: 10 });
    expect((annular.match(/A/g) ?? []).length).toBe(2);
  });

  it('compute_arrowhead_path is open by default, closed when filled', async () => {
    const open = await dOf('compute_arrowhead_path', { from: { x: 0, y: 0 }, to: { x: 10, y: 0 } });
    const filled = await dOf('compute_arrowhead_path', { from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, filled: true });
    expect(open.endsWith('Z')).toBe(false);
    expect(filled.endsWith('Z')).toBe(true);
  });
});

describe('shape scene kinds (compose_surface)', () => {
  it('renders a polygon node', async () => {
    const svg = await renderScene({ kind: 'polygon', points: [{ x: 20, y: 20 }, { x: 80, y: 30 }, { x: 50, y: 90 }] });
    expect(svg).toContain('<path');
  });

  it('renders a regular-polygon node', async () => {
    const svg = await renderScene({ kind: 'regular-polygon', cx: 100, cy: 100, r: 40, sides: 6 });
    expect(svg).toContain('<path');
  });

  it('renders a star node', async () => {
    const svg = await renderScene({ kind: 'star', cx: 100, cy: 100, outerRadius: 40, innerRadius: 18, points: 5 });
    expect(svg).toContain('<path');
  });

  it('renders an ellipse node', async () => {
    const svg = await renderScene({ kind: 'ellipse', cx: 100, cy: 100, rx: 50, ry: 30 });
    expect(svg).toContain('<path');
  });

  it('renders an arrowhead node', async () => {
    const svg = await renderScene({ kind: 'arrowhead', from: { x: 20, y: 100 }, to: { x: 120, y: 100 } });
    expect(svg).toContain('<path');
  });

  it('honors a fill on a closed wedge (clipped fill present)', async () => {
    const svg = await renderScene({ kind: 'wedge', cx: 100, cy: 100, r: 50, startAngle: 0, endAngle: 120, fill: '#ff0000' });
    expect(svg).toContain('<clipPath'); // closed + fill => clipped hachure
  });

  it('renders an open arc with no fill (the arc kind takes no fill)', async () => {
    const svg = await renderScene({ kind: 'arc', cx: 100, cy: 100, r: 50, startAngle: 0, endAngle: 120 });
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<clipPath'); // open stroke => no fill path to clip
  });
});

describe('arrow scene kind (compose_surface)', () => {
  const arrow = (extra: Record<string, unknown>) =>
    renderScene({ kind: 'arrow', from: { x: 20, y: 100 }, to: { x: 160, y: 100 }, ...extra });
  const paths = (svg: string) => (svg.match(/<path/g) ?? []).length;

  it('renders a shaft, an end head, and a label', async () => {
    const svg = await arrow({ label: 'flows to' });
    expect(paths(svg)).toBeGreaterThan(1); // shaft + head
    expect(svg).toContain('flows to');
  });

  it('endHead:false omits the end head', async () => {
    expect(paths(await arrow({ endHead: false }))).toBeLessThan(paths(await arrow({})));
  });

  it('startHead adds a second head (double-headed)', async () => {
    expect(paths(await arrow({ startHead: true }))).toBeGreaterThan(paths(await arrow({})));
  });

  it('a filled head fills (clipped); an open head does not', async () => {
    expect(await arrow({ filled: true, fill: '#ff0000' })).toContain('<clipPath');
    expect(await arrow({})).not.toContain('<clipPath');
  });

  it('orthogonal routing differs from straight', async () => {
    const s = await renderScene({ kind: 'arrow', from: { x: 20, y: 40 }, to: { x: 160, y: 140 }, routing: 'straight' });
    const o = await renderScene({ kind: 'arrow', from: { x: 20, y: 40 }, to: { x: 160, y: 140 }, routing: 'orthogonal' });
    expect(s).not.toBe(o);
  });
});
