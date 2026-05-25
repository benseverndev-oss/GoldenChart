import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { chartTools as tools } from './tools';

/** Minimal, fully-seeded sample input per tool so output is deterministic. */
const SAMPLES: Record<string, Record<string, unknown>> = {
  render_bar_chart: {
    width: 200,
    height: 140,
    vibe: 'clean_blueprint',
    data: [
      { label: 'a', value: 3 },
      { label: 'b', value: 6 },
    ],
  },
  render_line_chart: {
    width: 200,
    height: 140,
    vibe: 'clean_blueprint',
    series: [
      {
        id: 's1',
        points: [
          { x: 0, y: 1 },
          { x: 1, y: 4 },
          { x: 2, y: 2 },
        ],
      },
    ],
  },
  render_area_chart: {
    width: 200,
    height: 140,
    vibe: 'clean_blueprint',
    series: [
      {
        id: 's1',
        points: [
          { x: 0, y: 1 },
          { x: 1, y: 4 },
          { x: 2, y: 2 },
        ],
      },
    ],
  },
  render_scatter_plot: {
    width: 200,
    height: 140,
    vibe: 'clean_blueprint',
    data: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
  },
  render_pie_chart: {
    width: 160,
    height: 160,
    vibe: 'clean_blueprint',
    data: [
      { label: 'a', value: 1 },
      { label: 'b', value: 2 },
    ],
  },
  render_flowchart: {
    width: 240,
    height: 180,
    vibe: 'clean_blueprint',
    nodes: [
      { id: 'a', label: 'Start' },
      { id: 'b', label: 'End', parent: 'a' },
    ],
  },
};

describe('chart render tools', () => {
  it('registers all six chart tools', () => {
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        'render_area_chart',
        'render_bar_chart',
        'render_flowchart',
        'render_line_chart',
        'render_pie_chart',
        'render_scatter_plot',
      ].sort(),
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
