import { describe, expect, it } from 'vitest';
import { critiqueChart } from './critique';
import type { CompiledChart } from './compile';
import type { DataProfile } from './profile';
import { profileData } from './profile';
import { recommendChart } from './recommend';
import { compileChart } from './compile';

const EMPTY_PROFILE: DataProfile = { rowCount: 0, fields: [], shape: 'flat-records' };
const rules = (cs: ReturnType<typeof critiqueChart>) => cs.map((c) => c.rule);

const barData = (n: number, value = (i: number) => i + 1): CompiledChart => ({
  component: 'BarChart',
  props: { data: Array.from({ length: n }, (_, i) => ({ label: `c${i}`, value: value(i) })) },
});

describe('critiqueChart — fires on targeted fixtures', () => {
  it('flags too many bars and offers a grouping fix', () => {
    const cs = critiqueChart(barData(15), EMPTY_PROFILE, { width: 640 });
    const c = cs.find((x) => x.rule === 'too-many-categories')!;
    expect(c.severity).toBe('warn');
    expect(c.fix).toMatchObject({ keepTopCategories: 12 });
  });

  it('flags too many pie slices and suggests a bar chart', () => {
    const compiled: CompiledChart = {
      component: 'PieChart',
      props: { data: Array.from({ length: 9 }, (_, i) => ({ label: `s${i}`, value: i + 1 })) },
    };
    const c = critiqueChart(compiled, EMPTY_PROFILE).find((x) => x.rule === 'too-many-categories')!;
    expect(c.fix).toMatchObject({ chartType: 'bar' });
  });

  it('flags a pie with negative values as not part-of-whole', () => {
    const compiled: CompiledChart = {
      component: 'PieChart',
      props: {
        data: [
          { label: 'a', value: 5 },
          { label: 'b', value: -3 },
        ],
      },
    };
    expect(rules(critiqueChart(compiled, EMPTY_PROFILE))).toContain('pie-not-part-of-whole');
  });

  it('flags clustered bar values as low-contrast', () => {
    const cs = critiqueChart(
      barData(4, (i) => 100 + i),
      EMPTY_PROFILE,
      { width: 640 },
    );
    const c = cs.find((x) => x.rule === 'low-bar-contrast')!;
    expect(c.severity).toBe('info');
    expect(c.fix).toMatchObject({ chartType: 'line' });
  });

  it('flags a bar chart over a temporal field', () => {
    const profile: DataProfile = {
      rowCount: 3,
      shape: 'single-series',
      fields: [
        { name: 'month', type: 'temporal', cardinality: 3, example: '2021-01-01' },
        { name: 'sales', type: 'quantitative', cardinality: 3, example: 1 },
      ],
    };
    expect(rules(critiqueChart(barData(3), profile))).toContain('temporal-trend');
  });

  it('detects axis-label collisions with real text metrics', () => {
    const compiled: CompiledChart = {
      component: 'BarChart',
      props: {
        data: Array.from({ length: 10 }, (_, i) => ({
          label: `Very long category label ${i}`,
          value: i + 1,
        })),
      },
    };
    const c = critiqueChart(compiled, EMPTY_PROFILE, { width: 400 }).find(
      (x) => x.rule === 'axis-label-collision',
    )!;
    expect(c.severity).toBe('warn');
    expect(c.fix).toMatchObject({ rotateLabels: 45 });
  });

  it('flags more series than the palette can distinguish', () => {
    const compiled: CompiledChart = {
      component: 'LineChart',
      props: { series: Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, points: [] })) },
    };
    const c = critiqueChart(compiled, EMPTY_PROFILE).find(
      (x) => x.rule === 'too-many-series-colors',
    )!;
    expect(c.severity).toBe('warn');
  });
});

describe('critiqueChart — quiet on clean input', () => {
  it('returns no critiques for a small, well-spread bar chart', () => {
    const compiled = barData(4, (i) => (i + 1) * 25); // 25, 50, 75, 100 — well spread
    expect(critiqueChart(compiled, EMPTY_PROFILE, { width: 640 })).toEqual([]);
  });

  it('returns no critiques for a 3-series line chart', () => {
    const compiled: CompiledChart = {
      component: 'LineChart',
      props: {
        series: [
          { id: 'a', points: [] },
          { id: 'b', points: [] },
          { id: 'c', points: [] },
        ],
      },
    };
    expect(critiqueChart(compiled, EMPTY_PROFILE)).toEqual([]);
  });
});

describe('critiqueChart — end-to-end through the pipeline', () => {
  it('critiques a chart compiled from raw records', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ team: `Team ${i}`, points: 50 + i }));
    const rec = recommendChart(profileData(data))[0];
    const compiled = compileChart(data, rec);
    const cs = critiqueChart(compiled, profileData(data), { width: 480 });
    // 20 long-labelled categories → both crowding and label-collision warnings.
    expect(rules(cs)).toContain('too-many-categories');
  });
});
