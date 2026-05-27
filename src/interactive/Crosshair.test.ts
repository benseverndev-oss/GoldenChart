import { describe, expect, it } from 'vitest';
import { nearestMark } from './Crosshair';

const marks = [
  { cx: 0, cy: 0, id: 'a' },
  { cx: 50, cy: 50, id: 'b' },
  { cx: 100, cy: 0, id: 'c' },
];

describe('nearestMark', () => {
  it('returns the closest mark by pixel distance', () => {
    expect(nearestMark(marks, 48, 52)?.id).toBe('b');
    expect(nearestMark(marks, 95, 5)?.id).toBe('c');
  });

  it('returns null for an empty set', () => {
    expect(nearestMark([], 10, 10)).toBeNull();
  });
});
