import { describe, expect, it } from 'vitest';
import { profileData } from './profile';

describe('profileData', () => {
  it('returns an empty profile for no data', () => {
    expect(profileData([])).toEqual({ rowCount: 0, fields: [], shape: 'flat-records' });
  });

  it('types quantitative, categorical and temporal fields', () => {
    const p = profileData([
      { date: '2024-01-01', region: 'NA', revenue: 10 },
      { date: '2024-02-01', region: 'EU', revenue: 20 },
    ]);
    const byName = Object.fromEntries(p.fields.map((f) => [f.name, f.type]));
    expect(byName.date).toBe('temporal');
    expect(byName.region).toBe('categorical');
    expect(byName.revenue).toBe('quantitative');
  });

  it('records cardinality and numeric extent', () => {
    const p = profileData([{ v: 1 }, { v: 5 }, { v: 5 }]);
    const v = p.fields[0];
    expect(v.cardinality).toBe(2);
    expect(v.min).toBe(1);
    expect(v.max).toBe(5);
  });

  it('detects graph shape from source/target', () => {
    expect(profileData([{ source: 'a', target: 'b', value: 3 }]).shape).toBe('graph');
  });

  it('detects hierarchy shape from id/parent', () => {
    expect(profileData([{ id: 'r' }, { id: 'a', parent: 'r' }]).shape).toBe('hierarchy');
  });

  it('detects single-series and multi-series', () => {
    expect(
      profileData([
        { cat: 'a', n: 1 },
        { cat: 'b', n: 2 },
      ]).shape,
    ).toBe('single-series');
    expect(
      profileData([
        { month: 'Jan', team: 'x', n: 1 },
        { month: 'Feb', team: 'y', n: 2 },
      ]).shape,
    ).toBe('multi-series');
  });
});
