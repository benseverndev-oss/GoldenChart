import { describe, expect, it } from 'vitest';
import { chartTools } from './tools';
import { calcTools } from './calcTools';
import { visualizeTools } from './visualizeTool';

const tool = (name: string) => [...chartTools, ...calcTools, ...visualizeTools].find((t) => t.name === name)!;

describe('multi-series bar modes', () => {
  const multi = [
    { label: 'Q1', values: { sales: 3, returns: 1 } },
    { label: 'Q2', values: { sales: 5, returns: 2 } },
  ];

  it('renders grouped bars', async () => {
    const res = await tool('render_bar_chart').handler({ width: 300, height: 200, mode: 'grouped', data: multi });
    expect(res.content[0].text.startsWith('<svg')).toBe(true);
  });

  it('renders stacked bars', async () => {
    const res = await tool('render_bar_chart').handler({ width: 300, height: 200, mode: 'stacked', data: multi });
    expect(res.content[0].text).toContain('<path');
  });
});

describe('stacked area', () => {
  it('renders stacked series', async () => {
    const res = await tool('render_area_chart').handler({
      width: 300,
      height: 200,
      stacked: true,
      series: [
        { id: 'a', points: [{ x: 0, y: 1 }, { x: 1, y: 2 }] },
        { id: 'b', points: [{ x: 0, y: 2 }, { x: 1, y: 1 }] },
      ],
    });
    expect(res.content[0].text.startsWith('<svg')).toBe(true);
  });
});

describe('annotations', () => {
  it('draws a reference line and callout on a line chart', async () => {
    const res = await tool('render_line_chart').handler({
      width: 300,
      height: 200,
      series: [{ id: 's', points: [{ x: 0, y: 1 }, { x: 1, y: 4 }, { x: 2, y: 2 }] }],
      annotations: [
        { kind: 'y-line', value: 3, label: 'target' },
        { kind: 'point-callout', x: 1, y: 4, text: 'peak' },
      ],
    });
    expect(res.content[0].text).toContain('peak');
  });
});

describe('profile_data', () => {
  it('reports field types and shape', async () => {
    const res = await tool('profile_data').handler({
      data: [
        { date: '2024-01-01', revenue: 10 },
        { date: '2024-02-01', revenue: 20 },
      ],
    });
    const profile = res.structuredContent as { shape: string; fields: { name: string; type: string }[] };
    expect(profile.shape).toBe('single-series');
    expect(profile.fields.find((f) => f.name === 'revenue')!.type).toBe('quantitative');
  });
});

describe('compute_color_scale', () => {
  it('returns a ramp and a value color', async () => {
    const res = await tool('compute_color_scale').handler({ scale: 'viridis', domain: [0, 10], steps: 5, value: 5 });
    expect(res.structuredContent!.ramp).toHaveLength(5);
    expect(res.structuredContent!.valueColor).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('visualize_data', () => {
  it('auto-picks a chart and returns SVG + rationale + alternatives', async () => {
    const res = await tool('visualize_data').handler({
      width: 300,
      height: 200,
      data: [
        { region: 'NA', sales: 3 },
        { region: 'EU', sales: 7 },
        { region: 'APAC', sales: 5 },
      ],
    });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    const sc = res.structuredContent as { chosen: { chartType: string; rationale: string }; alternatives: unknown[] };
    expect(sc.chosen.chartType).toBe('bar');
    expect(sc.chosen.rationale).toBeTruthy();
    expect(Array.isArray(sc.alternatives)).toBe(true);
  });

  it('honors intent (trend ⇒ line over time)', async () => {
    const res = await tool('visualize_data').handler({
      width: 300,
      height: 200,
      intent: 'trend',
      data: [
        { date: '2024-01-01', revenue: 10 },
        { date: '2024-02-01', revenue: 20 },
      ],
    });
    expect((res.structuredContent as { chosen: { chartType: string } }).chosen.chartType).toBe('line');
  });
});

describe('accessibility data table', () => {
  it('does not emit a table in bare SVG (table lives in the wrapper div)', async () => {
    const res = await tool('render_bar_chart').handler({
      width: 200,
      height: 140,
      dataTable: true,
      description: 'quarterly sales',
      data: [{ label: 'a', value: 3 }],
    });
    const svg = res.content[0].text;
    expect(svg).toContain('<desc>quarterly sales</desc>');
    expect(svg).not.toContain('<table');
  });
});
