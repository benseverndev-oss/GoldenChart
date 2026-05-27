import { describe, expect, it } from 'vitest';
import { parseChartQuery } from './queryParse';
import { profileData } from './profile';

const rows = [
  { month: 'Jan', revenue: 12, region: 'NA', units: 100 },
  { month: 'Feb', revenue: 19, region: 'EU', units: 80 },
  { month: 'Mar', revenue: 7, region: 'NA', units: 60 },
];
const profile = profileData(rows);

describe('parseChartQuery — intent', () => {
  it('maps "over time" to trend', () => {
    expect(parseChartQuery('revenue over time', profile).intent).toBe('trend');
  });
  it('maps "compare" to compare', () => {
    expect(parseChartQuery('compare revenue across region', profile).intent).toBe('compare');
  });
  it('maps "breakdown" to composition', () => {
    expect(parseChartQuery('revenue breakdown', profile).intent).toBe('composition');
  });
  it('maps "relationship" to correlation', () => {
    expect(parseChartQuery('relationship between units and revenue', profile).intent).toBe('correlation');
  });
});

describe('parseChartQuery — chart type override', () => {
  it('forces a pie', () => {
    expect(parseChartQuery('revenue as a pie', profile).chartType).toBe('pie');
  });
  it('treats donut as a pie with an inner radius', () => {
    const hints = parseChartQuery('revenue as a donut', profile);
    expect(hints.chartType).toBe('pie');
    expect(Number(hints.props?.innerRadius)).toBeGreaterThan(0);
  });
  it('forces a scatter', () => {
    expect(parseChartQuery('show units and revenue as a scatter', profile).chartType).toBe('scatter');
  });
});

describe('parseChartQuery — field roles', () => {
  it('"revenue by month" resolves x=month, y=revenue', () => {
    expect(parseChartQuery('revenue by month', profile).roles).toMatchObject({ x: 'month', y: 'revenue' });
  });
  it('"split by region" resolves a series', () => {
    expect(parseChartQuery('revenue split by region', profile).roles?.series).toBe('region');
  });
  it('"units vs revenue" resolves x=units, y=revenue', () => {
    expect(parseChartQuery('units vs revenue', profile).roles).toMatchObject({ x: 'units', y: 'revenue' });
  });
  it('matches field names case- and plural-insensitively', () => {
    expect(parseChartQuery('Revenue by Months', profile).roles).toMatchObject({ x: 'month', y: 'revenue' });
  });
});

describe('parseChartQuery — vibe', () => {
  it('matches a preset name', () => {
    expect(parseChartQuery('revenue in pencil', profile).vibe).toBe('pencil');
  });
  it('matches a multi-word preset with a space', () => {
    expect(parseChartQuery('revenue on a sticky note', profile).vibe).toBe('sticky_note');
  });
  it('tolerates a one-edit typo', () => {
    expect(parseChartQuery('revenue in pencl', profile).vibe).toBe('pencil');
  });
  it('maps a mood word to a preset', () => {
    expect(parseChartQuery('make it professional', profile).vibe).toBe('clean_blueprint');
  });
});

describe('parseChartQuery — confidence & unresolved', () => {
  it('returns low confidence and no hints for an empty query', () => {
    const hints = parseChartQuery('', profile);
    expect(hints.intent).toBeUndefined();
    expect(hints.chartType).toBeUndefined();
    expect(hints.confidence).toBeLessThanOrEqual(0.2);
  });
  it('records unmappable words as unresolved', () => {
    expect(parseChartQuery('floopy zorptangle', profile).unresolved.length).toBeGreaterThan(0);
  });
  it('rises in confidence as it resolves more', () => {
    const hints = parseChartQuery('revenue by month as a line in pencil', profile);
    expect(hints.confidence).toBeGreaterThan(0.6);
    expect(hints.unresolved).toEqual([]);
  });
  it('never throws on odd input', () => {
    expect(() => parseChartQuery('???  ...', profile)).not.toThrow();
  });
});
