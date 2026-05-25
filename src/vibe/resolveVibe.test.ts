import { describe, expect, it } from 'vitest';
import { resolveVibe, vibeToRoughOptions } from './resolveVibe';
import { VIBE_PRESETS } from './presets';

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
