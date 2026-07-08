import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { extraChartTools as tools } from './tools';

const SAMPLES: Record<string, Record<string, unknown>> = {
  render_sankey: {
    width: 400,
    height: 300,
    vibe: 'clean_blueprint',
    nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    links: [
      { source: 'a', target: 'b', value: 5 },
      { source: 'b', target: 'c', value: 5 },
    ],
  },
  render_treemap: {
    width: 200,
    height: 200,
    vibe: 'clean_blueprint',
    data: [
      { id: 'root' },
      { id: 'a', parent: 'root', value: 3, label: 'A' },
      { id: 'b', parent: 'root', value: 1, label: 'B' },
    ],
  },
  render_heatmap: {
    width: 220,
    height: 160,
    vibe: 'clean_blueprint',
    data: [
      { x: 'a', y: '1', value: 1 },
      { x: 'b', y: '1', value: 5 },
      { x: 'a', y: '2', value: 3 },
      { x: 'b', y: '2', value: 8 },
    ],
  },
  render_radar: {
    width: 240,
    height: 240,
    vibe: 'clean_blueprint',
    axes: ['speed', 'power', 'range'],
    series: [{ id: 's1', values: [3, 5, 2] }],
  },
  render_choropleth: {
    width: 480,
    height: 300,
    vibe: 'clean_blueprint',
    data: [
      { region: 'CA', value: 39 },
      { region: 'TX', value: 30 },
      { region: 'NY', value: 20 },
    ],
    colorScale: 'blues',
  },
};

describe('extra chart render tools', () => {
  it('registers sankey, treemap, heatmap, radar and choropleth', () => {
    expect(tools.map((t) => t.name).sort()).toEqual(
      ['render_choropleth', 'render_heatmap', 'render_radar', 'render_sankey', 'render_treemap'].sort(),
    );
  });

  for (const tool of tools) {
    describe(tool.name, () => {
      const sample = SAMPLES[tool.name];

      it('accepts its sample input against the declared schema', () => {
        expect(z.object(tool.config.inputSchema).safeParse(sample).success).toBe(true);
      });

      it('renders standalone SVG', async () => {
        const result = await tool.handler(sample);
        const svg = result.content[0].text;
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain('<path');
        expect(svg).not.toContain('<div');
      });

      it('is deterministic (golden snapshot)', async () => {
        const result = await tool.handler(sample);
        expect(result.content[0].text).toMatchSnapshot();
      });
    });
  }
});
