import { describe, expect, it } from 'vitest';
import { bandScale, linearScale } from './scales';
import { ticksForScale } from './ticks';

describe('ticksForScale', () => {
  it('produces evenly spaced ticks for a linear scale', () => {
    const ticks = ticksForScale(linearScale([0, 10], [0, 100]), 5);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toHaveProperty('value');
    expect(ticks[0]).toHaveProperty('offset');
    // 0 -> range start, 10 -> range end
    const zero = ticks.find((t) => t.value === 0);
    expect(zero?.offset).toBe(0);
  });

  it('centers ticks on each band for a band scale', () => {
    const scale = bandScale(['a', 'b'], [0, 100], 0);
    const ticks = ticksForScale(scale);
    expect(ticks.map((t) => t.value)).toEqual(['a', 'b']);
    // first band spans [0,50], so its tick sits at 25
    expect(ticks[0].offset).toBeCloseTo(25, 5);
  });
});
