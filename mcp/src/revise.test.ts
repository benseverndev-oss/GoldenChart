import { describe, expect, it } from 'vitest';
import { applyRevisions, intentForChartType, trimTopCategories, trimTopSeries } from './revise';

describe('trimTopCategories', () => {
  it('keeps the top N by value and groups the rest under the given label', () => {
    const data = [
      { region: 'NA', revenue: 100 },
      { region: 'EU', revenue: 80 },
      { region: 'APAC', revenue: 50 },
      { region: 'LATAM', revenue: 20 },
      { region: 'AFRICA', revenue: 15 },
    ];
    // keep=2 means the output is 1 top category + the Other bucket (= 2 rows total).
    expect(trimTopCategories(data, 2, 'Other')).toEqual([
      { region: 'NA', revenue: 100 },
      { region: 'Other', revenue: 165 },
    ]);
  });

  it('returns the input unchanged when it already fits within `keep`', () => {
    const data = [{ x: 'a', n: 1 }];
    expect(trimTopCategories(data, 5, 'Other')).toBe(data);
  });
});

describe('trimTopSeries', () => {
  it('keeps only the first N distinct series values', () => {
    const data = [
      { month: 'Jan', series: 'A', value: 1 },
      { month: 'Jan', series: 'B', value: 2 },
      { month: 'Jan', series: 'C', value: 3 },
      { month: 'Feb', series: 'A', value: 4 },
      { month: 'Feb', series: 'B', value: 5 },
      { month: 'Feb', series: 'C', value: 6 },
    ];
    const trimmed = trimTopSeries(data, 2);
    expect(trimmed.map((r) => r.series)).toEqual(['A', 'B', 'A', 'B']);
  });
});

describe('applyRevisions', () => {
  it('composes trimming + series cap in one pass', () => {
    const data = [
      { region: 'NA', revenue: 100 },
      { region: 'EU', revenue: 80 },
      { region: 'APAC', revenue: 50 },
    ];
    expect(applyRevisions(data, { keepTopCategories: 2, groupRemainderAs: 'Rest' })).toEqual([
      { region: 'NA', revenue: 100 },
      { region: 'Rest', revenue: 130 },
    ]);
  });

  it('returns the input unchanged for an empty revision', () => {
    const data = [{ a: 'x', n: 1 }];
    expect(applyRevisions(data, {})).toBe(data);
  });
});

describe('intentForChartType', () => {
  it('maps each chart type to a recommender intent', () => {
    expect(intentForChartType('bar')).toBe('compare');
    expect(intentForChartType('line')).toBe('trend');
    expect(intentForChartType('area')).toBe('trend');
    expect(intentForChartType('pie')).toBe('composition');
    expect(intentForChartType('scatter')).toBe('correlation');
    expect(intentForChartType(undefined)).toBeUndefined();
  });
});
