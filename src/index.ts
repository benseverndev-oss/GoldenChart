// Types
export * from './types';

// Vibe engine
export {
  VIBE_PRESETS,
  DEFAULT_VIBE,
  resolveVibe,
  vibeToRoughOptions,
  VibeProvider,
  useVibeContext,
  useResolvedVibe,
} from './vibe';
export type { VibeProviderProps } from './vibe';

// Calculation layer (D3, DOM-free)
export * from './core';

// Rendering primitives (Rough.js)
export { RoughPath, RoughLine, RoughRectangle, RoughCircle } from './primitives';
export { getRoughGenerator, drawableToPaths } from './render/roughGenerator';
export type { RoughPathInfo } from './render/roughGenerator';

// High-level components
export { Surface, BarChart, Flowchart } from './components';
export type { SurfaceProps, BarChartProps, FlowchartProps } from './components';
