import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import type { RoughPathInfo } from '../render/roughGenerator';

interface SketchPathsProps {
  paths: RoughPathInfo[];
  className?: string;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<SVGElement>) => void;
  children?: ReactNode;
}

/**
 * Internal: renders Rough.js path descriptors as real SVG `<path>` elements so
 * React—not Rough.js—owns the DOM. Shared by every primitive.
 */
export function SketchPaths({ paths, className, style, onClick, children }: SketchPathsProps) {
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
        />
      ))}
      {children}
    </g>
  );
}
