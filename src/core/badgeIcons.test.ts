// src/core/badgeIcons.test.ts
import { describe, it, expect } from 'vitest';
import { BADGE_ICON_PATHS, BADGE_TONE_COLORS, BADGE_ICONS, BADGE_TONES } from './badgeIcons';

describe('badgeIcons', () => {
  it('exposes a stroke path string for every icon name', () => {
    for (const name of BADGE_ICONS) {
      const entry = BADGE_ICON_PATHS[name];
      const strokes = Array.isArray(entry) ? entry : [entry];
      expect(strokes.length).toBeGreaterThan(0);
      for (const d of strokes) {
        // Stroke-only contract: no fills (no `Z`), nothing closes the path.
        expect(d).not.toMatch(/[Zz]/);
        expect(d.length).toBeGreaterThan(0);
      }
    }
  });
  it('has a color for every fixed tone (success/warn/danger)', () => {
    expect(BADGE_TONE_COLORS.success).toMatch(/^#/);
    expect(BADGE_TONE_COLORS.warn).toMatch(/^#/);
    expect(BADGE_TONE_COLORS.danger).toMatch(/^#/);
  });
  it('lists every supported tone literal', () => {
    expect(new Set(BADGE_TONES)).toEqual(new Set(['neutral', 'info', 'success', 'warn', 'danger']));
  });
});
