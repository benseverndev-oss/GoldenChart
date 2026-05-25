import type { ResolvedVibe, RoughOptions, VibeConfig } from '../types/vibe';
import { DEFAULT_VIBE, VIBE_PRESETS } from './presets';

/**
 * Collapse any `VibeConfig` (a bare preset name, or a preset + overrides, or
 * just overrides) into a fully-resolved vibe. This is the single boundary
 * between the loose user-facing config and the strict internal shape.
 */
export function resolveVibe(config?: VibeConfig): ResolvedVibe {
  if (config === undefined) {
    return VIBE_PRESETS[DEFAULT_VIBE];
  }

  if (typeof config === 'string') {
    return VIBE_PRESETS[config];
  }

  const base = VIBE_PRESETS[config.preset ?? DEFAULT_VIBE];

  // Only spread keys the caller actually set, so `undefined` never clobbers a
  // preset value. `fill` is handled explicitly because `null` is meaningful.
  const { preset: _preset, fill, ...overrides } = config;
  const merged: ResolvedVibe = { ...base };
  const mutable = merged as unknown as Record<string, unknown>;
  const source = overrides as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value !== undefined) {
      mutable[key] = value;
    }
  }

  if (fill !== undefined) {
    merged.fill = fill;
  }

  return merged;
}

/**
 * Translate a resolved vibe into the exact options object Rough.js consumes.
 * Keeping this isolated means the rendering layer never reasons about presets.
 */
export function vibeToRoughOptions(vibe: ResolvedVibe, seedOverride?: number): RoughOptions {
  const options: RoughOptions = {
    roughness: vibe.roughness,
    bowing: vibe.bowing,
    stroke: vibe.stroke,
    strokeWidth: vibe.strokeWidth,
    fillStyle: vibe.fillStyle,
    fillWeight: vibe.fillWeight,
    hachureAngle: vibe.hachureAngle,
    hachureGap: vibe.hachureGap,
    curveStepCount: vibe.curveStepCount,
    curveTightness: vibe.curveTightness,
    disableMultiStroke: vibe.disableMultiStroke,
    seed: seedOverride ?? vibe.seed,
  };

  // Rough.js treats the absence of `fill` as "stroke only"; never pass null.
  if (vibe.fill !== null) {
    options.fill = vibe.fill;
  }

  return options;
}
