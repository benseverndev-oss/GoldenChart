import { useMemo } from 'react';
import type { RoughCircleProps } from '../types/primitives';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { vibeToRoughOptions } from '../vibe/resolveVibe';
import { allFinite, getRoughGenerator, drawableToPaths } from '../render/roughGenerator';
import { SketchPaths } from './SketchPaths';

/** A sketchy circle — scatter points, pie wedges' guides, flowchart terminals. */
export function RoughCircle({
  cx,
  cy,
  diameter,
  vibe,
  seed,
  stroke,
  fill,
  className,
  style,
  onClick,
  children,
}: RoughCircleProps) {
  const resolved = useResolvedVibe(vibe, seed);

  const paths = useMemo(() => {
    if (!allFinite(cx, cy, diameter)) return [];
    const shapeVibe = {
      ...resolved,
      stroke: stroke ?? resolved.stroke,
      fill: fill === undefined ? resolved.fill : fill,
    };
    const options = vibeToRoughOptions(shapeVibe, shapeVibe.seed);
    const drawable = getRoughGenerator().circle(cx, cy, diameter, options);
    return drawableToPaths(drawable);
  }, [cx, cy, diameter, resolved, stroke, fill]);

  const r = diameter / 2;
  const clip = allFinite(cx, cy, diameter)
    ? `M${cx - r},${cy}a${r},${r} 0 1,0 ${diameter},0a${r},${r} 0 1,0 ${-diameter},0z`
    : undefined;

  return (
    <SketchPaths paths={paths} className={className} style={style} onClick={onClick} animate={!!resolved.animate?.drawOn} clip={clip}>
      {children}
    </SketchPaths>
  );
}
