import { RoughRectangle } from '../primitives/RoughRectangle';

export interface BrushOverlayProps {
  /** Rect origin in viewBox x. */
  start: number;
  /** Rect width in viewBox units. */
  length: number;
  /** Plot height to span. */
  height: number;
}

/** A sketched translucent selection rectangle for an x-axis brush. */
export function Brush({ start, length, height }: BrushOverlayProps) {
  if (length <= 0 || height <= 0) return null;
  return (
    <RoughRectangle x={start} y={0} width={length} height={height} style={{ opacity: 0.25 }} />
  );
}
