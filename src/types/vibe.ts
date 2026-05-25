import type { Options as RoughOptions } from 'roughjs/bin/core';

/**
 * Semantic aesthetics. Each maps to a fully-resolved set of Rough.js knobs in
 * `vibe/presets.ts`. This is the "dial" most consumers will touch.
 */
export type VibePreset = 'messy_sketch' | 'clean_blueprint' | 'chaotic_notebook';

/** Rough.js fill hatching styles, surfaced verbatim so power users keep full control. */
export type FillStyle =
  | 'hachure'
  | 'solid'
  | 'zigzag'
  | 'cross-hatch'
  | 'dots'
  | 'dashed'
  | 'zigzag-line';

/**
 * The individual aesthetic knobs. Every field is optional so overrides can be
 * layered onto a preset. Names mirror Rough.js options where they exist, plus a
 * few text knobs the renderer needs.
 */
export interface VibeOverrides {
  /** 0 = perfectly straight, ~3+ = very shaky. */
  roughness?: number;
  /** How much lines bow/curve away from their endpoints. */
  bowing?: number;
  strokeWidth?: number;
  stroke?: string;
  /** `null` means "no fill". Omit to inherit the preset. */
  fill?: string | null;
  fillStyle?: FillStyle;
  fillWeight?: number;
  hachureAngle?: number;
  hachureGap?: number;
  /** Controls how many points are used to render a curved path. */
  curveStepCount?: number;
  curveTightness?: number;
  /** Draw each stroke once instead of the sketchy double-stroke. */
  disableMultiStroke?: boolean;
  /**
   * Deterministic seed for Rough.js jitter. A stable, non-zero seed keeps the
   * sketch identical across re-renders and SSR hydration. `0` re-randomizes.
   */
  seed?: number;
  fontFamily?: string;
  fontSize?: number;
}

/**
 * A preset with every knob filled in. The Vibe engine resolves any `VibeConfig`
 * down to this shape before it ever reaches Rough.js.
 */
export interface ResolvedVibe extends Required<Omit<VibeOverrides, 'fill'>> {
  preset: VibePreset;
  fill: string | null;
}

/**
 * What consumers pass to `<Surface>`, a `VibeProvider`, or any primitive. Either
 * a bare preset name, or a preset plus targeted overrides.
 */
export type VibeConfig = VibePreset | (VibeOverrides & { preset?: VibePreset });

/** Subset of Rough.js options the Vibe engine produces. Re-exported for typing. */
export type { RoughOptions };
