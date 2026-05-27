import { describe, expect, it } from 'vitest';
import { pixelToValue, marksInPixelRange } from './brush';

describe('brush math', () => {
  it('pixelToValue inverts a linear pixel range to a domain value', () => {
    expect(pixelToValue(100, [0, 200], [0, 100])).toBe(50);
  });

  it('pixelToValue handles an inverted (y) pixel range', () => {
    // y pixels run top->bottom [0,200] mapping to values [100,0]; pixel 50 -> 75
    expect(pixelToValue(50, [0, 200], [100, 0])).toBe(75);
  });

  it('marksInPixelRange filters by cx for an x-brush (inclusive, order preserved)', () => {
    const marks = [
      { key: 'a', cx: 10, cy: 0 },
      { key: 'b', cx: 50, cy: 0 },
      { key: 'c', cx: 90, cy: 0 },
    ];
    expect(marksInPixelRange(marks, [40, 100], 'x').map((m) => m.key)).toEqual(['b', 'c']);
  });

  it('marksInPixelRange filters by cy for a y-brush and normalizes a reversed range', () => {
    const marks = [
      { key: 'a', cx: 0, cy: 10 },
      { key: 'b', cx: 0, cy: 50 },
    ];
    expect(marksInPixelRange(marks, [60, 0], 'y').map((m) => m.key)).toEqual(['a', 'b']);
  });
});
