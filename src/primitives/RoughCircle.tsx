import { useMemo } from 'react';
import type { RoughCircleProps } from '../types/primitives';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { vibeToRoughOptions } from '../vibe/resolveVibe';
import { getRoughGenerator, drawableToPaths } from '../render/roughGenerator';
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
    const shapeVibe = {
      ...resolved,
      stroke: stroke ?? resolved.stroke,
      fill: fill === undefined ? resolved.fill : fill,
    };
    const options = vibeToRoughOptions(shapeVibe, shapeVibe.seed);
    const drawable = getRoughGenerator().circle(cx, cy, diameter, options);
    return drawableToPaths(drawable);
  }, [cx, cy, diameter, resolved, stroke, fill]);

  return (
    <SketchPaths paths={paths} className={className} style={style} onClick={onClick}>
      {children}
    </SketchPaths>
  );
}
