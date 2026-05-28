import { describe, expect, it } from 'vitest';
import { profileData } from './profile';
import { recommendChart } from './recommend';

const top = (data: Record<string, unknown>[], intent?: Parameters<typeof recommendChart>[1]) =>
  recommendChart(profileData(data), intent)[0];

describe('recommendChart', () => {
  it('recommends a line for a measure over time', () => {
    const r = top([
      { date: '2024-01-01', revenue: 10 },
      { date: '2024-02-01', revenue: 14 },
    ]);
    expect(r.chartType).toBe('line');
    expect(r.encoding.x).toBe('date');
    expect(r.rationale).toBeTruthy();
  });

  it('recommends a bar for one category + one measure', () => {
    expect(
      top([
        { region: 'NA', sales: 3 },
        { region: 'EU', sales: 7 },
      ]).chartType,
    ).toBe('bar');
  });

  it('recommends a scatter for two quantitative fields', () => {
    expect(
      top([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 1 },
      ]).chartType,
    ).toBe('scatter');
  });

  it('recommends a sankey for graph data', () => {
    expect(top([{ source: 'a', target: 'b', value: 5 }]).chartType).toBe('sankey');
  });

  it('recommends a treemap for hierarchy data', () => {
    expect(top([{ id: 'r' }, { id: 'a', parent: 'r', value: 2 }]).chartType).toBe('treemap');
  });

  it('intent biases the ranking toward composition charts', () => {
    const data = [
      { region: 'NA', sales: 3 },
      { region: 'EU', sales: 7 },
      { region: 'APAC', sales: 5 },
    ];
    const withIntent = recommendChart(profileData(data), 'composition');
    expect(withIntent.some((r) => r.chartType === 'pie')).toBe(true);
  });

  it('always returns at least a fallback', () => {
    expect(recommendChart(profileData([{ note: 'x' }])).length).toBeGreaterThan(0);
  });
});
