import { createElement } from 'react';
import type { ReactElement } from 'react';
import {
  RoughPath,
  RoughRectangle,
  RoughCircle,
  RoughLine,
  RoughText,
  polygonPath,
  regularPolygonPath,
  starPath,
  arcStrokePath,
  wedgePath,
  ellipsePath,
  arrowHeadPath,
} from 'goldenchart';
import type { PrimitiveSpec } from './schemas';

/** Degrees -> radians. Scene specs use friendly degrees; core builders take radians. */
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Map a serializable `PrimitiveSpec` to its GoldenChart primitive element.
 * Shared by the Level-2 render tools and `compose_surface`, so both produce
 * identical drawings from the same scene description.
 */
export function primitiveToElement(spec: PrimitiveSpec, key: string | number): ReactElement {
  switch (spec.kind) {
    case 'path':
      return createElement(RoughPath, { key, d: spec.d, stroke: spec.stroke, fill: spec.fill, seed: spec.seed, vibe: spec.vibe });
    case 'rect':
      return createElement(RoughRectangle, {
        key,
        x: spec.x,
        y: spec.y,
        width: spec.width,
        height: spec.height,
        stroke: spec.stroke,
        fill: spec.fill,
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'circle':
      return createElement(RoughCircle, {
        key,
        cx: spec.cx,
        cy: spec.cy,
        diameter: spec.diameter,
        stroke: spec.stroke,
        fill: spec.fill,
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'line':
      return createElement(RoughLine, {
        key,
        x1: spec.x1,
        y1: spec.y1,
        x2: spec.x2,
        y2: spec.y2,
        stroke: spec.stroke,
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'text':
      return createElement(RoughText, {
        key,
        x: spec.x,
        y: spec.y,
        anchor: spec.anchor,
        baseline: spec.baseline,
        rotate: spec.rotate,
        fill: spec.fill,
        maxWidth: spec.maxWidth,
        seed: spec.seed,
        vibe: spec.vibe,
        children: spec.text,
      });
    // SP2 shape primitives: each resolves to a path `d` rendered via RoughPath.
    case 'polygon':
      return createElement(RoughPath, {
        key,
        d: polygonPath(spec.points),
        stroke: spec.stroke,
        fill: spec.fill,
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'regular-polygon':
      return createElement(RoughPath, {
        key,
        d: regularPolygonPath(spec.cx, spec.cy, spec.r, spec.sides, toRad(spec.rotation ?? 0)),
        stroke: spec.stroke,
        fill: spec.fill,
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'star':
      return createElement(RoughPath, {
        key,
        d: starPath(spec.cx, spec.cy, spec.outerRadius, spec.innerRadius, spec.points, toRad(spec.rotation ?? 0)),
        stroke: spec.stroke,
        fill: spec.fill,
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'arc':
      return createElement(RoughPath, {
        key,
        d: arcStrokePath(spec.cx, spec.cy, spec.r, toRad(spec.startAngle), toRad(spec.endAngle)),
        stroke: spec.stroke,
        fill: null, // open stroke: never fill, regardless of any supplied fill
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'wedge':
      return createElement(RoughPath, {
        key,
        d: wedgePath(spec.cx, spec.cy, spec.r, toRad(spec.startAngle), toRad(spec.endAngle), spec.innerRadius),
        stroke: spec.stroke,
        fill: spec.fill,
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'ellipse':
      return createElement(RoughPath, {
        key,
        d: ellipsePath(spec.cx, spec.cy, spec.rx, spec.ry),
        stroke: spec.stroke,
        fill: spec.fill,
        seed: spec.seed,
        vibe: spec.vibe,
      });
    case 'arrowhead':
      return createElement(RoughPath, {
        key,
        d: arrowHeadPath(spec.from, spec.to, spec.size, spec.filled ?? false),
        stroke: spec.stroke,
        // Open head suppresses fill; a filled (closed) head honors the caller's fill.
        fill: spec.filled ? spec.fill : null,
        seed: spec.seed,
        vibe: spec.vibe,
      });
  }
}
