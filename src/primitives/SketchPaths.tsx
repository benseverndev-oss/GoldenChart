import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import type { RoughPathInfo } from '../render/roughGenerator';

interface SketchPathsProps {
  paths: RoughPathInfo[];
  className?: string;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<SVGElement>) => void;
  children?: ReactNode;
  /** Normalize path length to 1 so the draw-on reveal animation can dash it. */
  animate?: boolean;
}

/**
 * Internal: renders Rough.js path descriptors as real SVG `<path>` elements so
 * React—not Rough.js—owns the DOM. Shared by every primitive.
 */
export function SketchPaths({ paths, className, style, onClick, children, animate }: SketchPathsProps) {
  return (
    <g className={className} style={style} onClick={onClick}>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill={p.fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={animate ? 1 : undefined}
        />
      ))}
      {children}
    </g>
  );
}
