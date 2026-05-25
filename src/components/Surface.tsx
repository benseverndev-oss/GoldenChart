import type { CSSProperties, ReactNode } from 'react';
import type { VibeConfig } from '../types/vibe';
import { VibeProvider } from '../vibe/VibeProvider';

export interface SurfaceProps {
  width: number;
  height: number;
  vibe?: VibeConfig;
  title?: string;
  /** Tailwind classes for the outer container element. */
  className?: string;
  /** Tailwind classes applied to the inner `<svg>`. */
  svgClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /**
   * Render only the `<svg>` (no Tailwind wrapper `<div>`) with an explicit
   * `xmlns`, producing a standalone, serializable SVG. Used by the headless
   * `renderToSVGString` path and the MCP server.
   */
  bare?: boolean;
}

/**
 * The container every chart renders into: a Tailwind-styled wrapper around a
 * single `<svg>`, with a `VibeProvider` so descendant primitives inherit the
 * aesthetic. This is the only place wrapper styling lives.
 */
export function Surface({
  width,
  height,
  vibe,
  title,
  className = 'inline-block max-w-full overflow-visible',
  svgClassName = 'block h-auto w-full',
  style,
  children,
  bare = false,
}: SurfaceProps) {
  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={bare ? undefined : svgClassName}
      role="img"
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );

  return (
    <VibeProvider vibe={vibe}>
      {bare ? (
        svg
      ) : (
        <div className={className} style={style}>
          {svg}
        </div>
      )}
    </VibeProvider>
  );
}
