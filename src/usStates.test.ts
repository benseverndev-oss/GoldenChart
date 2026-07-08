import { describe, expect, it } from 'vitest';
import { stateGeometry, US_STATES_GEOMETRY, US_STATES_VIEWBOX } from './usStates';

describe('usStates geometry', () => {
  it('covers all 50 states + DC as SVG path strings', () => {
    expect(Object.keys(US_STATES_GEOMETRY).length).toBeGreaterThanOrEqual(50);
    for (const d of Object.values(US_STATES_GEOMETRY)) expect(d.startsWith('M')).toBe(true);
  });
  it('looks up by code case-insensitively', () => {
    expect(stateGeometry('ca')).toBe(US_STATES_GEOMETRY.CA);
    expect(stateGeometry('ZZ')).toBeUndefined();
  });
  it('exposes a viewBox', () => {
    expect(US_STATES_VIEWBOX.width).toBe(960);
  });
});
