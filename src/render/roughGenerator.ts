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

/**
 * Whether every coordinate is a finite number. Primitives call this before
 * handing geometry to Rough.js: a NaN/Infinity width or radius sends Rough.js'
 * hachure fill into an unbounded loop (it steps by `hachureGap` across an
 * infinite span), so we skip drawing degenerate shapes instead.
 */
export function allFinite(...nums: number[]): boolean {
  return nums.every((n) => Number.isFinite(n));
}

/** Whether a path string is safe to draw — non-empty and free of NaN/Infinity. */
export function pathIsRenderable(d: string): boolean {
  if (d.trim() === '') return false;
  return !/NaN|Infinity/.test(d);
}

/** Whether a path is the sketch outline or part of the fill/hatching. */
export type RoughPathKind = 'stroke' | 'fill';

/** Flat description of one `<path>` element to render for a sketchy drawable. */
export interface RoughPathInfo {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill: string;
  /** `stroke` = the sketch outline; `fill` = solid fill or hachure lines. */
  kind: RoughPathKind;
}

/**
 * Turn a Rough.js `Drawable` into plain `<path>` descriptors. Rough.js emits
 * separate ops for the outline, the solid fill, and the hatching sketch — we
 * render each as its own path so React owns the DOM, not Rough.js.
 *
 * `toPaths` emits exactly one path per op-set, in order, so the returned paths
 * line up 1:1 with `drawable.sets`: a `path` set is the outline; `fillPath` and
 * `fillSketch` are the fill. We surface that as `kind` so callers can clip the
 * fill to the shape and animate only the outline.
 */
export function drawableToPaths(drawable: Drawable): RoughPathInfo[] {
  const infos = getRoughGenerator().toPaths(drawable) as Omit<RoughPathInfo, 'kind'>[];
  const sets = drawable.sets ?? [];
  return infos.map((info, i) => ({
    ...info,
    kind: sets[i]?.type === 'path' ? 'stroke' : 'fill',
  }));
}
