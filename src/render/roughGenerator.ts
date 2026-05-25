import rough from 'roughjs';
import type { RoughGenerator } from 'roughjs/bin/generator';
import type { Drawable } from 'roughjs/bin/core';

/**
 * A single, DOM-free Rough.js generator shared by every primitive. The
 * generator only does math (path string -> sketchy path strings); it never
 * touches the DOM, which is exactly what keeps rendering React/SSR-safe.
 */
let generator: RoughGenerator | null = null;

export function getRoughGenerator(): RoughGenerator {
  if (generator === null) {
    generator = rough.generator();
  }
  return generator;
}

/** Flat description of one `<path>` element to render for a sketchy drawable. */
export interface RoughPathInfo {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill: string;
}

/**
 * Turn a Rough.js `Drawable` into plain `<path>` descriptors. Rough.js emits
 * separate ops for the outline, the solid fill, and the hatching sketch — we
 * render each as its own path so React owns the DOM, not Rough.js.
 */
export function drawableToPaths(drawable: Drawable): RoughPathInfo[] {
  return getRoughGenerator().toPaths(drawable) as RoughPathInfo[];
}
