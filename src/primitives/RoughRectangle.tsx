import { useMemo } from 'react';
import type { RoughRectangleProps } from '../types/primitives';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { vibeToRoughOptions } from '../vibe/resolveVibe';
import { getRoughGenerator, drawableToPaths } from '../render/roughGenerator';
import { SketchPaths } from './SketchPaths';

/** A sketchy rectangle — the workhorse for bars and flowchart nodes. */
export function RoughRectangle({
  x,
  y,
  width,
  height,
  vibe,
  seed,
  stroke,
  fill,
  className,
  style,
  onClick,
  children,
}: RoughRectangleProps) {
  const resolved = useResolvedVibe(vibe, seed);

  const paths = useMemo(() => {
    const shapeVibe = {
      ...resolved,
      stroke: stroke ?? resolved.stroke,
      fill: fill === undefined ? resolved.fill : fill,
    };
    const options = vibeToRoughOptions(shapeVibe, shapeVibe.seed);
    const drawable = getRoughGenerator().rectangle(x, y, width, height, options);
    return drawableToPaths(drawable);
  }, [x, y, width, height, resolved, stroke, fill]);

  const clip = `M${x},${y}h${width}v${height}h${-width}z`;

  return (
    <SketchPaths paths={paths} className={className} style={style} onClick={onClick} animate={!!resolved.animate?.drawOn} clip={clip}>
      {children}
    </SketchPaths>
  );
}
