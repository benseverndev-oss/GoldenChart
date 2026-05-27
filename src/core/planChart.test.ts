import { describe, expect, it } from 'vitest';
import { planChart } from './planChart';
import { profileData } from './profile';
import { recommendChart } from './recommend';

const rows = [
  { month: 'Jan', revenue: 12, region: 'NA', units: 100 },
  { month: 'Feb', revenue: 19, region: 'EU', units: 80 },
  { month: 'Mar', revenue: 7, region: 'NA', units: 60 },
];

describe('planChart', () => {
  it('falls back to the recommender when no query/intent is given', () => {
    const plan = planChart(rows, {});
    const top = recommendChart(profileData(rows))[0];
    expect(plan.recommendation.chartType).toBe(top.chartType);
    expect(plan.compiled.component).toBeTruthy();
  });

  it('honors an explicit chart-type override from the query', () => {
    const plan = planChart(rows, { query: 'revenue by region as a pie' });
    expect(plan.recommendation.chartType).toBe('pie');
    expect(plan.compiled.component).toBe('PieChart');
  });

  it('maps neutral roles to the chart-specific encoding keys (pie → label/value)', () => {
    const plan = planChart(rows, { query: 'revenue by region as a pie' });
    const data = plan.compiled.props.data as { label: string; value: number }[];
    expect(typeof data[0].label).toBe('string');
    expect(data[0].value).toBe(12);
  });

  it('applies field-role overrides to a line chart', () => {
    const plan = planChart(rows, { query: 'revenue by month as a line' });
    expect(plan.compiled.component).toBe('LineChart');
    expect(plan.recommendation.encoding).toMatchObject({ x: 'month', y: 'revenue' });
  });

  it('routes a query intent into the recommender (trend → line)', () => {
    // Temporal single-series data: a line is a real candidate the trend intent
    // can boost. The parser nudges the recommender; it never invents a chart.
    const ts = [
      { date: '2024-01-01', revenue: 12 },
      { date: '2024-02-01', revenue: 19 },
      { date: '2024-03-01', revenue: 7 },
    ];
    const plan = planChart(ts, { query: 'revenue over time' });
    expect(plan.recommendation.chartType).toBe('line');
  });

  it('threads a parsed vibe into the compiled props', () => {
    const plan = planChart(rows, { query: 'revenue by month in pencil' });
    expect(plan.compiled.props.vibe).toBe('pencil');
  });

  it('returns alternatives excluding the chosen recommendation', () => {
    const plan = planChart(rows, { query: 'revenue over time' });
    expect(plan.alternatives.every((a) => a !== plan.recommendation)).toBe(true);
  });

  it('exposes the parsed hints', () => {
    const plan = planChart(rows, { query: 'revenue by month as a line' });
    expect(plan.hints.chartType).toBe('line');
  });
});
