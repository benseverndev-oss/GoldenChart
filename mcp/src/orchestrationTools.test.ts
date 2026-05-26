import { describe, expect, it } from 'vitest';
import { orchestrationTools } from './orchestrationTools';

const byName = (name: string) => orchestrationTools.find((t) => t.name === name)!;

describe('compose_surface', () => {
  it('renders a mixed scene (primitive + chart) into one SVG with a shared vibe', async () => {
    const res = await byName('compose_surface').handler({
      width: 400,
      height: 240,
      vibe: 'clean_blueprint',
      children: [
        { kind: 'text', x: 200, y: 20, text: 'Dashboard' },
        {
          kind: 'chart',
          chart: 'bar',
          at: { x: 0, y: 30 },
          width: 200,
          height: 180,
          props: { data: [{ label: 'a', value: 3 }, { label: 'b', value: 6 }] },
        },
        {
          kind: 'chart',
          chart: 'pie',
          at: { x: 210, y: 30 },
          width: 180,
          height: 180,
          props: { data: [{ label: 'x', value: 2 }, { label: 'y', value: 1 }] },
        },
      ],
    });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Dashboard');
    // nested chart svgs sit inside the outer surface
    expect(svg.match(/<svg/g)?.length).toBeGreaterThan(1);
    expect(svg).toMatchSnapshot();
  });
});

describe('build_flowchart_from_spec', () => {
  it('auto-assigns node shapes and renders a flowchart', async () => {
    const res = await byName('build_flowchart_from_spec').handler({
      width: 360,
      height: 240,
      direction: 'TB',
      nodes: [
        { id: 'a', label: 'Start' },
        { id: 'b', label: 'Ready?', parent: 'a' },
        { id: 'c', label: 'Go', parent: 'b' },
      ],
    });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Ready?');
    expect(svg).toContain('<path');
    expect(svg).toMatchSnapshot();
  });

  it('renders a merge (DAG) spec with multiple parents', async () => {
    const res = await byName('build_flowchart_from_spec').handler({
      width: 360,
      height: 260,
      direction: 'TB',
      nodes: [
        { id: 'a', label: 'Plan' },
        { id: 'b', label: 'Build' },
        { id: 'c', label: 'Review' },
      ],
      edges: [
        { from: 'a', to: 'c' },
        { from: 'b', to: 'c' },
      ],
    });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Review');
    expect(svg).toContain('<path');
  });

  it('accepts orthogonal edge routing', async () => {
    const res = await byName('build_flowchart_from_spec').handler({
      width: 360,
      height: 240,
      direction: 'LR',
      routing: 'orthogonal',
      nodes: [
        { id: 'a', label: 'Start' },
        { id: 'b', label: 'End', parent: 'a' },
      ],
    });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
  });
});
