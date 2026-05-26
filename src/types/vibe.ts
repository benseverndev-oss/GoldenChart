import type { Options as RoughOptions } from 'roughjs/bin/core';

/**
 * Semantic aesthetics. Each maps to a fully-resolved set of Rough.js knobs in
 * `vibe/presets.ts`. This is the "dial" most consumers will touch.
 */
export type VibePreset =
  | 'messy_sketch'
  | 'clean_blueprint'
  | 'chaotic_notebook'
  | 'pencil'
  | 'marker'
  | 'ink'
  | 'crayon'
  | 'davinci_journal'
  | 'blueprint_dark'
  | 'chalkboard'
  | 'neon'
  | 'comic_book'
  | 'terminal'
  | 'watercolor'
  | 'newsprint';

/** Optional "draw-on" reveal: strokes animate as if being sketched. */
export interface VibeAnimate {
  drawOn?: boolean;
  durationMs?: number;
}

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
  /**
   * Canvas/page colour. Painted as a full-surface backdrop and used wherever
   * the renderer needs to match the page (node fills, the gap behind zone
   * labels). Omit to keep the surface transparent over a white page. Not a
   * Rough.js knob — consumed by the renderer.
   */
  background?: string;
  /** Reveal animation. Not a Rough.js knob — consumed by the renderer. */
  animate?: VibeAnimate;
}

/**
 * A preset with every knob filled in. The Vibe engine resolves any `VibeConfig`
 * down to this shape before it ever reaches Rough.js. `fill` and `animate` are
 * handled explicitly (nullable / optional) rather than via `Required`.
 */
export interface ResolvedVibe extends Required<Omit<VibeOverrides, 'fill' | 'animate' | 'background'>> {
  preset: VibePreset;
  fill: string | null;
  /** Optional page colour; see `VibeOverrides.background`. */
  background?: string;
  animate?: VibeAnimate;
}

/**
 * What consumers pass to `<Surface>`, a `VibeProvider`, or any primitive. Either
 * a bare preset name, or a preset plus targeted overrides.
 */
export type VibeConfig = VibePreset | (VibeOverrides & { preset?: VibePreset });

/** Subset of Rough.js options the Vibe engine produces. Re-exported for typing. */
export type { RoughOptions };
