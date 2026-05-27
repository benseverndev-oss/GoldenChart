import { useId } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
import type { RoughPathInfo } from '../render/roughGenerator';

interface SketchPathsProps {
  paths: RoughPathInfo[];
  className?: string;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<SVGElement>) => void;
  /** Inert `data-*` attributes (e.g. from `markAttrs`) spread onto the group. */
  dataAttrs?: Record<string, string>;
  onPointerEnter?: (event: PointerEvent<SVGElement>) => void;
  onPointerMove?: (event: PointerEvent<SVGElement>) => void;
  onPointerLeave?: (event: PointerEvent<SVGElement>) => void;
  onPointerDown?: (event: PointerEvent<SVGElement>) => void;
  onPointerUp?: (event: PointerEvent<SVGElement>) => void;
  children?: ReactNode;
  /** Normalize path length to 1 so the draw-on reveal animation can dash it. */
  animate?: boolean;
  /**
   * Geometric (un-roughened) outline `d` for the shape. When set, fill/hachure
   * paths are clipped to it so the hatching can't bleed past the shape edge.
   * The sketch outline stays unclipped, preserving the loose hand-drawn look.
   */
  clip?: string | null;
}

/**
 * Internal: renders Rough.js path descriptors as real SVG `<path>` elements so
 * React—not Rough.js—owns the DOM. Shared by every primitive. Clips fill paths
 * to the shape (when a `clip` outline is supplied) and, during the draw-on
 * reveal, dashes only the outline while the fill fades in.
 */
export function SketchPaths({
  paths,
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
  animate,
  clip,
}: SketchPathsProps) {
  const rawId = useId();
  const hasFill = paths.some((p) => p.kind === 'fill');
  const clipId = clip && hasFill ? `gc-clip-${rawId.replace(/:/g, '')}` : null;

  return (
    <g
      className={className}
      style={style}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      {...dataAttrs}
    >
      {clipId ? (
        <clipPath id={clipId}>
          <path d={clip!} />
        </clipPath>
      ) : null}
      {/* Solid (transparent) hit area for interactive marks, so hover/click
          register across the whole shape and not just the hand-drawn strokes
          (hachure fills leave gaps that otherwise flicker the hover state).
          Only emitted for tagged marks, so non-interactive output is unchanged. */}
      {dataAttrs && clip ? <path d={clip} fill="transparent" stroke="none" data-gc-hit="" /> : null}
      {paths.map((p, i) => {
        const isStroke = p.kind === 'stroke';
        return (
          <path
            key={i}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill={p.fill}
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={!isStroke && clipId ? `url(#${clipId})` : undefined}
            className={animate ? (isStroke ? 'gc-draw-stroke' : 'gc-draw-fill') : undefined}
            pathLength={animate && isStroke ? 1 : undefined}
          />
        );
      })}
      {children}
    </g>
  );
}
