import { describe, expect, it } from 'vitest';
import { profileData } from './profile';
import { recommendChart } from './recommend';
import { compileChart } from './compile';
import type { Series } from '../types/charts';

const compileTop = (data: Record<string, unknown>[]) => compileChart(data, recommendChart(profileData(data))[0]);

describe('compileChart', () => {
  it('compiles a bar chart to label/value data', () => {
    const c = compileTop([{ region: 'NA', sales: 3 }, { region: 'EU', sales: 7 }]);
    expect(c.component).toBe('BarChart');
    expect(c.props.data).toEqual([
      { label: 'NA', value: 3 },
      { label: 'EU', value: 7 },
    ]);
  });

  it('compiles a line chart to a series with numeric x', () => {
    const c = compileTop([
      { date: '2024-01-01', revenue: 10 },
      { date: '2024-02-01', revenue: 20 },
    ]);
    expect(c.component).toBe('LineChart');
    const series = c.props.series as Series[];
    expect(series).toHaveLength(1);
    expect(series[0].points).toHaveLength(2);
    expect(typeof series[0].points[0].x).toBe('number');
  });

  it('compiles graph data to sankey nodes + links', () => {
    const c = compileTop([
      { source: 'a', target: 'b', value: 5 },
      { source: 'a', target: 'c', value: 2 },
    ]);
    expect(c.component).toBe('SankeyChart');
    expect((c.props.nodes as unknown[]).length).toBe(3);
    expect((c.props.links as unknown[]).length).toBe(2);
  });

  it('plots a categorical x as evenly-spaced indices, not all-zero', () => {
    const c = compileChart(
      [
        { month: 'Jan', revenue: 12 },
        { month: 'Feb', revenue: 19 },
        { month: 'Mar', revenue: 7 },
      ],
      { chartType: 'line', encoding: { x: 'month', y: 'revenue' }, confidence: 0.7, rationale: '' },
    );
    const series = c.props.series as Series[];
    const xs = series[0].points.map((p) => p.x);
    expect(xs).toEqual([0, 1, 2]);
  });

  it('groups a second category into multi-series bars', () => {
    const c = compileChart(
      [
        { month: 'Jan', team: 'x', n: 1 },
        { month: 'Jan', team: 'y', n: 2 },
        { month: 'Feb', team: 'x', n: 3 },
      ],
      { chartType: 'bar', encoding: { x: 'month', series: 'team', y: 'n' }, confidence: 0.8, rationale: '' },
    );
    expect(c.props.mode).toBe('grouped');
    expect(c.props.seriesKeys).toEqual(['x', 'y']);
  });
});
