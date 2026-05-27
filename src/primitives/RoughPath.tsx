import { useMemo } from 'react';
import type { RoughPathProps } from '../types/primitives';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { vibeToRoughOptions } from '../vibe/resolveVibe';
import { getRoughGenerator, drawableToPaths, pathIsRenderable } from '../render/roughGenerator';
import { SketchPaths } from './SketchPaths';

/**
 * The foundational primitive. Takes an SVG path `d` string (typically produced
 * by the D3 calculation layer) and renders it as a hand-drawn sketch using the
 * resolved vibe. Every higher-level shape and chart is built on top of this.
 *
 * D3 decides *where* the path goes; the vibe decides *how* it looks.
 */
export function RoughPath({
  d,
  vibe,
  seed,
  stroke,
  fill,
  className,
  style,
  onClick,
  dataAttrs,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  children,
}: RoughPathProps) {
  const resolved = useResolvedVibe(vibe, seed);

  const paths = useMemo(() => {
    if (!pathIsRenderable(d)) return [];

    // Per-shape stroke/fill overrides win over the vibe, but only for this path.
    const shapeVibe = {
      ...resolved,
      stroke: stroke ?? resolved.stroke,
      fill: fill === undefined ? resolved.fill : fill,
    };

    const options = vibeToRoughOptions(shapeVibe, shapeVibe.seed);
    const drawable = getRoughGenerator().path(d, options);
    return drawableToPaths(drawable);
  }, [d, resolved, stroke, fill]);

  return (
    <SketchPaths
      paths={paths}
      className={className}
      style={style}
      onClick={onClick}
      dataAttrs={dataAttrs}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      animate={!!resolved.animate?.drawOn}
      clip={pathIsRenderable(d) ? d : undefined}
    >
      {children}
    </SketchPaths>
  );
}
