import type { ResolvedVibe, RoughOptions, VibeConfig } from '../types/vibe';
import { DEFAULT_VIBE, VIBE_PRESETS } from './presets';

/**
 * Look up a preset, falling back to the default (with a dev warning) when the
 * name isn't one we ship. Guards against a typo'd preset name producing
 * `undefined` and a cryptic downstream crash.
 */
function presetOrDefault(preset: string | undefined): ResolvedVibe {
  if (preset === undefined) {
    return VIBE_PRESETS[DEFAULT_VIBE];
  }
  const found = VIBE_PRESETS[preset as keyof typeof VIBE_PRESETS];
  if (found === undefined) {
    console.warn(
      `[goldenchart] Unknown vibe preset "${preset}"; falling back to "${DEFAULT_VIBE}". ` +
        `Valid presets: ${Object.keys(VIBE_PRESETS).join(', ')}.`,
    );
    return VIBE_PRESETS[DEFAULT_VIBE];
  }
  return found;
}

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
    return presetOrDefault(config);
  }

  const base = presetOrDefault(config.preset);

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
