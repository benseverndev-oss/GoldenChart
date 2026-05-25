import { describe, expect, it } from 'vitest';
import { VIBE_PRESETS } from './presets';
import { resolveVibe } from './resolveVibe';

describe('vibe presets & animation', () => {
  it('ships the new presets with full resolved knobs', () => {
    for (const name of ['pencil', 'marker', 'ink', 'crayon'] as const) {
      const v = VIBE_PRESETS[name];
      expect(v.preset).toBe(name);
      expect(typeof v.roughness).toBe('number');
      expect(typeof v.fontFamily).toBe('string');
    }
  });

  it('carries the animate config through resolveVibe', () => {
    const resolved = resolveVibe({ preset: 'ink', animate: { drawOn: true, durationMs: 1200 } });
    expect(resolved.animate?.drawOn).toBe(true);
    expect(resolved.animate?.durationMs).toBe(1200);
  });

  it('leaves animate undefined when not requested', () => {
    expect(resolveVibe('marker').animate).toBeUndefined();
  });
});
