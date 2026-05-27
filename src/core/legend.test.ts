import { describe, expect, it } from 'vitest';
import { layoutLegend } from './legend';

const items = [
  { label: 'sales', color: '#ef4444' },
  { label: 'returns', color: '#f59e0b' },
  { label: 'support', color: '#10b981' },
];
const FONT = 'sans-serif';

describe('layoutLegend', () => {
  it('lays a few items on a single centred row when they fit', () => {
    const l = layoutLegend(items, 600, { fontFamily: FONT });
    const ys = new Set(l.rows.map((r) => r.y));
    expect(ys.size).toBe(1); // one row
    expect(l.height).toBe(22);
    // centred: first item starts past the left edge
    expect(l.rows[0].x).toBeGreaterThan(0);
    // left-to-right
    expect(l.rows[1].x).toBeGreaterThan(l.rows[0].x);
  });

  it('wraps to multiple rows when the width is too small', () => {
    const l = layoutLegend(items, 90, { fontFamily: FONT });
    const ys = new Set(l.rows.map((r) => r.y));
    expect(ys.size).toBeGreaterThan(1);
    expect(l.height).toBe(22 * ys.size);
  });

  it('keeps every item within the available width', () => {
    const l = layoutLegend(items, 600, { fontFamily: FONT });
    for (const r of l.rows) expect(r.x).toBeGreaterThanOrEqual(0);
    expect(l.width).toBe(600);
  });

  it('returns nothing for no items', () => {
    expect(layoutLegend([], 600, { fontFamily: FONT })).toEqual({ rows: [], width: 0, height: 0 });
  });

  it('preserves label and color on each placed item', () => {
    const l = layoutLegend(items, 600, { fontFamily: FONT });
    expect(l.rows.map((r) => r.label)).toEqual(['sales', 'returns', 'support']);
    expect(l.rows[0].color).toBe('#ef4444');
  });
});
