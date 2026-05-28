import { describe, expect, it } from 'vitest';
import { applyTransforms, logScale, timeScale, type Row } from './transform';

const rows: Row[] = [
  { cat: 'a', region: 'x', v: 3 },
  { cat: 'b', region: 'x', v: 10 },
  { cat: 'c', region: 'y', v: 1 },
  { cat: 'd', region: 'y', v: 6 },
];

describe('applyTransforms', () => {
  it('sorts ascending and descending, stably', () => {
    expect(applyTransforms(rows, [{ op: 'sort', by: 'v' }]).map((r) => r.v)).toEqual([1, 3, 6, 10]);
    expect(applyTransforms(rows, [{ op: 'sort', by: 'v', dir: 'desc' }]).map((r) => r.v)).toEqual([
      10, 6, 3, 1,
    ]);
  });

  it('filters with comparators including in', () => {
    expect(
      applyTransforms(rows, [{ op: 'filter', field: 'v', cmp: '>=', value: 6 }]).map((r) => r.v),
    ).toEqual([10, 6]);
    expect(
      applyTransforms(rows, [{ op: 'filter', field: 'cat', cmp: 'in', value: ['a', 'c'] }]).map(
        (r) => r.cat,
      ),
    ).toEqual(['a', 'c']);
  });

  it('topN drops the tail', () => {
    expect(applyTransforms(rows, [{ op: 'topN', by: 'v', n: 2 }]).map((r) => r.v)).toEqual([10, 6]);
  });

  it('topN group-other rolls the remainder into one bucket', () => {
    const out = applyTransforms(rows, [
      { op: 'topN', by: 'v', n: 2, rest: 'group-other', labelField: 'cat' },
    ]);
    expect(out).toHaveLength(3);
    expect(out[2]).toEqual({ v: 4, cat: 'Other' }); // 3 + 1
  });

  it('aggregates by group with a reducer', () => {
    const out = applyTransforms(rows, [
      { op: 'aggregate', groupBy: ['region'], field: 'v', reducer: 'sum', as: 'total' },
    ]);
    expect(out).toEqual([
      { region: 'x', total: 13 },
      { region: 'y', total: 7 },
    ]);
  });

  it('bins a field into equal-width buckets with counts', () => {
    const out = applyTransforms(
      [{ v: 0 }, { v: 1 }, { v: 2 }, { v: 9 }, { v: 10 }],
      [{ op: 'bin', field: 'v', bins: 2 }],
    );
    expect(out.map((r) => r.count)).toEqual([3, 2]);
    expect(out).toHaveLength(2);
  });

  it('computes a rolling reducer over a window', () => {
    const out = applyTransforms(
      [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }],
      [{ op: 'rolling', field: 'v', window: 2, reducer: 'mean', as: 'avg' }],
    );
    expect(out.map((r) => r.avg)).toEqual([1, 1.5, 2.5, 3.5]);
  });

  it('pivots long rows to wide', () => {
    const long: Row[] = [
      { day: 'Mon', series: 'a', val: 1 },
      { day: 'Mon', series: 'b', val: 2 },
      { day: 'Tue', series: 'a', val: 3 },
    ];
    const out = applyTransforms(long, [
      { op: 'pivot', index: 'day', column: 'series', value: 'val' },
    ]);
    expect(out).toEqual([
      { day: 'Mon', a: 1, b: 2 },
      { day: 'Tue', a: 3 },
    ]);
  });

  it('chains transforms left to right and never mutates input', () => {
    const snapshot = JSON.stringify(rows);
    const out = applyTransforms(rows, [
      { op: 'filter', field: 'v', cmp: '>', value: 2 },
      { op: 'sort', by: 'v', dir: 'desc' },
      { op: 'topN', by: 'v', n: 2 },
    ]);
    expect(out.map((r) => r.v)).toEqual([10, 6]);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });
});

describe('scales', () => {
  it('log scale maps decades and produces ticks', () => {
    const s = logScale([1, 1000], [0, 300]);
    expect(s(1)).toBe(0);
    expect(s(1000)).toBe(300);
    expect(Math.round(s(10))).toBe(100);
    expect(s.ticks().length).toBeGreaterThan(0);
  });

  it('time scale maps an epoch domain', () => {
    const t0 = Date.UTC(2020, 0, 1);
    const t1 = Date.UTC(2021, 0, 1);
    const s = timeScale([t0, t1], [0, 100]);
    expect(s(t0)).toBe(0);
    expect(s(t1)).toBe(100);
  });
});
