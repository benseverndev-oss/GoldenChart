import { describe, expect, it } from 'vitest';
import { defaultSeriesVisibility } from './SeriesVisibilityContext';

describe('defaultSeriesVisibility', () => {
  it('hides nothing and its toggle is a harmless no-op', () => {
    expect(defaultSeriesVisibility.hidden.size).toBe(0);
    expect(() => defaultSeriesVisibility.toggle('s1')).not.toThrow();
  });
});
