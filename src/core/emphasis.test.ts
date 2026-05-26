import { describe, expect, it } from 'vitest';
import { linearRegression, pickPoint, resolveEmphasis } from './emphasis';
import type { Series } from '../types/charts';

const line: Series = {
  id: 'a',
  points: [
    { x: 0, y: 1 },
    { x: 1, y: 3 },
    { x: 2, y: 5 },
    { x: 3, y: 7 },
  ],
};

describe('linearRegression', () => {
  it('fits a perfect line exactly', () => {
    const { slope, intercept } = linearRegression(line.points);
    expect(slope).toBeCloseTo(2, 10);
    expect(intercept).toBeCloseTo(1, 10);
  });
});

describe('pickPoint', () => {
  it('selects by strategy', () => {
    const pts = [{ x: 0, y: 4 }, { x: 1, y: 9 }, { x: 2, y: 2 }];
    expect(pickPoint(pts, 'max')).toEqual({ x: 1, y: 9 });
    expect(pickPoint(pts, 'peak')).toEqual({ x: 1, y: 9 });
    expect(pickPoint(pts, 'min')).toEqual({ x: 2, y: 2 });
    expect(pickPoint(pts, 'first')).toEqual({ x: 0, y: 4 });
    expect(pickPoint(pts, 'last')).toEqual({ x: 2, y: 2 });
    expect(pickPoint([], 'max')).toBeUndefined();
  });
});

describe('resolveEmphasis', () => {
  it('resolves a linear trend to a segment across the x-extent', () => {
    const { annotations } = resolveEmphasis([line], [{ kind: 'trend' }]);
    expect(annotations).toEqual([{ kind: 'segment', x1: 0, y1: 1, x2: 3, y2: 7, color: undefined }]);
  });

  it('resolves a mean trend to a flat segment', () => {
    const { annotations } = resolveEmphasis([line], [{ kind: 'trend', method: 'mean' }]);
    expect(annotations[0]).toMatchObject({ kind: 'segment', y1: 4, y2: 4, label: 'mean' });
  });

  it('resolves an auto-callout to a templated point-callout at the extreme', () => {
    const { annotations } = resolveEmphasis([line], [{ kind: 'auto-callout', pick: 'max', template: 'Peak {value}' }]);
    expect(annotations[0]).toMatchObject({ kind: 'point-callout', x: 3, y: 7, text: 'Peak 7' });
  });

  it('mutes non-highlighted series', () => {
    const series = [line, { id: 'b', points: [{ x: 0, y: 0 }] }];
    const { muted, emphasized } = resolveEmphasis(series, [{ kind: 'highlight-series', id: 'a' }]);
    expect([...emphasized]).toEqual(['a']);
    expect([...muted]).toEqual(['b']);
  });

  it('emphasize mode does not mute others', () => {
    const series = [line, { id: 'b', points: [{ x: 0, y: 0 }] }];
    const { muted } = resolveEmphasis(series, [{ kind: 'highlight-series', id: 'a', mode: 'emphasize' }]);
    expect(muted.size).toBe(0);
  });

  it('ignores a trend targeting a missing series', () => {
    expect(resolveEmphasis([line], [{ kind: 'trend', series: 'nope' }]).annotations).toEqual([]);
  });
});
