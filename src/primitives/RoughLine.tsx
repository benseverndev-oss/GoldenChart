import { useMemo } from 'react';
import type { RoughLineProps } from '../types/primitives';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { vibeToRoughOptions } from '../vibe/resolveVibe';
import { allFinite, getRoughGenerator, drawableToPaths } from '../render/roughGenerator';
import { SketchPaths } from './SketchPaths';

/** A sketchy straight line between two D3-computed coordinates. */
export function RoughLine({
  x1,
  y1,
  x2,
  y2,
  vibe,
  seed,
  stroke,
  className,
  style,
  onClick,
  dataAttrs,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
}: RoughLineProps) {
  const resolved = useResolvedVibe(vibe, seed);

  const paths = useMemo(() => {
    if (!allFinite(x1, y1, x2, y2)) return [];
    const options = vibeToRoughOptions({ ...resolved, stroke: stroke ?? resolved.stroke }, resolved.seed);
    const drawable = getRoughGenerator().line(x1, y1, x2, y2, options);
    return drawableToPaths(drawable);
  }, [x1, y1, x2, y2, resolved, stroke]);

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
    />
  );
}
