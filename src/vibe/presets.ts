import type { ResolvedVibe, VibePreset } from '../types/vibe';

/**
 * Fully-resolved aesthetics. These are the single source of truth for what each
 * semantic preset "feels" like; `resolveVibe` layers user overrides on top.
 */
export const VIBE_PRESETS: Record<VibePreset, ResolvedVibe> = {
  messy_sketch: {
    preset: 'messy_sketch',
    roughness: 1.6,
    bowing: 1.5,
    strokeWidth: 1.5,
    stroke: '#1f2937',
    fill: '#1f2937',
    fillStyle: 'hachure',
    fillWeight: 1,
    hachureAngle: -41,
    hachureGap: 4,
    curveStepCount: 9,
    curveTightness: 0,
    disableMultiStroke: false,
    seed: 1,
    fontFamily: '"Comic Sans MS", "Segoe Print", cursive',
    fontSize: 14,
  },
  clean_blueprint: {
    preset: 'clean_blueprint',
    roughness: 0.6,
    bowing: 0.4,
    strokeWidth: 1.25,
    stroke: '#1d4ed8',
    fill: '#3b82f6',
    fillStyle: 'cross-hatch',
    fillWeight: 0.5,
    hachureAngle: 45,
    hachureGap: 6,
    curveStepCount: 14,
    curveTightness: 0,
    disableMultiStroke: true,
    seed: 7,
    fontFamily: '"Courier New", ui-monospace, monospace',
    fontSize: 13,
  },
  chaotic_notebook: {
    preset: 'chaotic_notebook',
    roughness: 2.8,
    bowing: 2.5,
    strokeWidth: 2,
    stroke: '#111827',
    fill: '#f59e0b',
    fillStyle: 'zigzag',
    fillWeight: 1.5,
    hachureAngle: 17,
    hachureGap: 3,
    curveStepCount: 6,
    curveTightness: 0.2,
    disableMultiStroke: false,
    seed: 13,
    fontFamily: '"Comic Sans MS", "Segoe Print", cursive',
    fontSize: 15,
  },
};

export const DEFAULT_VIBE: VibePreset = 'messy_sketch';
