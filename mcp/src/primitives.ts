import { createElement } from 'react';
import type { ReactElement } from 'react';
import { RoughPath, RoughRectangle, RoughCircle, RoughLine, RoughText } from 'goldenchart';
import type { PrimitiveSpec } from './schemas';

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
  }
}
