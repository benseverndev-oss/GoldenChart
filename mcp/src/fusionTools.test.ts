import { describe, expect, it } from 'vitest';
import { fusionTools } from './fusionTools';

const tool = fusionTools.find((t) => t.name === 'build_chart_from_fusioncharts')!;

describe('build_chart_from_fusioncharts', () => {
  it('renders a supported FusionCharts config to SVG', async () => {
    const res = await tool.handler({
      width: 400,
      height: 300,
      source: JSON.stringify({
        type: 'column2d',
        dataSource: { chart: { caption: 'X' }, data: [{ label: 'A', value: '10' }] },
      }),
    });
    expect(res.content[0].text.startsWith('<svg')).toBe(true);
  });

  it('returns a structured error for unsupported types', async () => {
    const res = await tool.handler({
      width: 400,
      height: 300,
      source: JSON.stringify({ type: 'gauge', dataSource: {} }),
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text.toLowerCase()).toContain('gauge');
  });
});
