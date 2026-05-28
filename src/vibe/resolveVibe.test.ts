import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveVibe, vibeToRoughOptions } from './resolveVibe';
import { DEFAULT_VIBE, VIBE_PRESETS } from './presets';

describe('resolveVibe', () => {
  it('defaults to messy_sketch when nothing is passed', () => {
    expect(resolveVibe().preset).toBe('messy_sketch');
  });

  it('resolves a bare preset name', () => {
    expect(resolveVibe('clean_blueprint')).toEqual(VIBE_PRESETS.clean_blueprint);
  });

  it('layers overrides on top of a preset without clobbering unset keys', () => {
    const resolved = resolveVibe({ preset: 'clean_blueprint', roughness: 9 });
    expect(resolved.roughness).toBe(9);
    expect(resolved.stroke).toBe(VIBE_PRESETS.clean_blueprint.stroke);
  });

  it('treats fill: null as "no fill" distinctly from omitting it', () => {
    expect(resolveVibe({ fill: null }).fill).toBeNull();
    expect(resolveVibe({ preset: 'messy_sketch' }).fill).toBe(VIBE_PRESETS.messy_sketch.fill);
  });

  it('ignores undefined override values', () => {
    const resolved = resolveVibe({ preset: 'messy_sketch', bowing: undefined });
    expect(resolved.bowing).toBe(VIBE_PRESETS.messy_sketch.bowing);
  });

  describe('brand overrides', () => {
    it('layers brand colour/font between the preset and explicit overrides', () => {
      const resolved = resolveVibe('ink', {
        stroke: '#brand',
        fill: '#bf',
        fontFamily: 'Brand Sans',
      });
      expect(resolved.stroke).toBe('#brand');
      expect(resolved.fill).toBe('#bf');
      expect(resolved.fontFamily).toBe('Brand Sans');
      // Untouched preset knobs survive.
      expect(resolved.roughness).toBe(VIBE_PRESETS.ink.roughness);
    });

    it('lets an explicit vibe override beat the brand', () => {
      const resolved = resolveVibe(
        { preset: 'ink', stroke: '#explicit' },
        { stroke: '#brand', fill: '#bf' },
      );
      expect(resolved.stroke).toBe('#explicit');
      expect(resolved.fill).toBe('#bf');
    });

    it('ignores an empty brand-overrides object (returns the shared preset)', () => {
      expect(resolveVibe('clean_blueprint', {})).toBe(VIBE_PRESETS.clean_blueprint);
    });
  });

  describe('unknown preset', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('falls back to the default vibe for an unknown bare preset name', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      // @ts-expect-error — exercising a runtime typo that bypasses the type
      const resolved = resolveVibe('not_a_real_preset');
      expect(resolved).toEqual(VIBE_PRESETS[DEFAULT_VIBE]);
    });

    it('falls back to the default base but keeps overrides for an unknown preset in config form', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      // @ts-expect-error — exercising a runtime typo that bypasses the type
      const resolved = resolveVibe({ preset: 'nope', roughness: 7 });
      expect(resolved.roughness).toBe(7);
      expect(resolved.stroke).toBe(VIBE_PRESETS[DEFAULT_VIBE].stroke);
    });

    it('warns once, naming the offending preset', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // @ts-expect-error — exercising a runtime typo that bypasses the type
      resolveVibe('not_a_real_preset');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain('not_a_real_preset');
    });
  });
});

describe('vibeToRoughOptions', () => {
  it('omits fill entirely when the vibe fill is null', () => {
    const options = vibeToRoughOptions(resolveVibe({ fill: null }));
    expect('fill' in options).toBe(false);
  });

  it('passes the seed override through', () => {
    const options = vibeToRoughOptions(resolveVibe('messy_sketch'), 42);
    expect(options.seed).toBe(42);
  });
});
