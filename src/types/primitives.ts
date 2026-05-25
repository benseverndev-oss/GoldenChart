import type { CSSProperties, ReactNode } from 'react';
import type { VibeConfig } from './vibe';

/**
 * Shared by every Rough.js primitive. A local `vibe` overrides the surrounding
 * `VibeProvider`; everything else is plain SVG passthrough.
 */
export interface RoughPrimitiveProps {
  /** Local vibe override. Falls back to the nearest `VibeProvider` context. */
  vibe?: VibeConfig;
  /** Per-instance seed override, handy for de-duplicating identical shapes. */
  seed?: number;
  className?: string;
  style?: CSSProperties;
  /** Forwarded to the rendered `<g>` so primitives stay composable/clickable. */
  onClick?: (event: React.MouseEvent<SVGGElement>) => void;
  children?: ReactNode;
}

export interface RoughPathProps extends RoughPrimitiveProps {
  /** SVG path `d` string, typically produced by the D3 calculation layer. */
  d: string;
  /** Explicit overrides that win over the resolved vibe for this shape only. */
  stroke?: string;
  fill?: string | null;
}

export interface RoughLineProps extends RoughPrimitiveProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
}

export interface RoughRectangleProps extends RoughPrimitiveProps {
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string;
  fill?: string | null;
}

export interface RoughCircleProps extends RoughPrimitiveProps {
  cx: number;
  cy: number;
  /** Diameter, matching Rough.js' `circle(x, y, diameter)` signature. */
  diameter: number;
  stroke?: string;
  fill?: string | null;
}
