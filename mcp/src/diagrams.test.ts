import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { diagramTools as tools } from './tools';

const SAMPLES: Record<string, Record<string, unknown>> = {
  render_mind_map: {
    width: 320,
    height: 320,
    vibe: 'clean_blueprint',
    nodes: [
      { id: 'root', label: 'Idea' },
      { id: 'a', label: 'Branch A', parent: 'root' },
      { id: 'b', label: 'Branch B', parent: 'root' },
      { id: 'a1', label: 'Leaf', parent: 'a' },
    ],
  },
  render_org_chart: {
    width: 400,
    height: 280,
    vibe: 'clean_blueprint',
    nodes: [
      { id: 'ceo', label: 'CEO' },
      { id: 'cto', label: 'CTO', parent: 'ceo' },
      { id: 'cfo', label: 'CFO', parent: 'ceo' },
    ],
    direction: 'TB',
  },
  render_architecture: {
    width: 480,
    height: 320,
    vibe: 'clean_blueprint',
    nodes: [
      { id: 'web', label: 'Web', group: 'Frontend' },
      { id: 'api', label: 'API', group: 'Backend' },
      { id: 'worker', label: 'Worker', group: 'Backend' },
      { id: 'db', label: 'Database', group: 'Data' },
    ],
    edges: [
      { from: 'web', to: 'api' },
      { from: 'api', to: 'db' },
      { from: 'worker', to: 'db' },
    ],
  },
  render_sequence: {
    width: 480,
    height: 320,
    vibe: 'clean_blueprint',
    actors: [
      { id: 'user', label: 'User' },
      { id: 'app', label: 'App' },
      { id: 'db', label: 'DB' },
    ],
    messages: [
      { from: 'user', to: 'app', label: 'click' },
      { from: 'app', to: 'db', label: 'query' },
      { from: 'app', to: 'app', label: 'validate' },
      { from: 'db', to: 'app', label: 'rows', kind: 'reply' },
    ],
  },
  render_er_diagram: {
    width: 560,
    height: 320,
    vibe: 'clean_blueprint',
    entities: [
      { id: 'user', label: 'User', fields: [{ name: 'id', type: 'uuid', key: 'PK' }, { name: 'email', type: 'text' }] },
      {
        id: 'order',
        label: 'Order',
        fields: [{ name: 'id', type: 'uuid', key: 'PK' }, { name: 'user_id', type: 'uuid', key: 'FK' }],
      },
    ],
    relationships: [{ from: 'user', to: 'order', label: 'places', fromCardinality: '1', toCardinality: 'N' }],
  },
  render_timeline: {
    width: 600,
    height: 240,
    vibe: 'clean_blueprint',
    events: [
      { date: '2021', label: 'Founded', detail: 'Two people, one idea' },
      { date: '2022', label: 'Seed round' },
      { date: '2023', label: 'Launch' },
    ],
  },
};

describe('diagram render tools', () => {
  it('registers the Roadmap 1 diagram types', () => {
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        'render_architecture',
        'render_er_diagram',
        'render_mind_map',
        'render_org_chart',
        'render_sequence',
        'render_timeline',
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
