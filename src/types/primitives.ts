import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
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
  /** Forwarded to the rendered element so primitives stay composable/clickable. */
  onClick?: (event: MouseEvent<SVGElement>) => void;
  /**
   * Inert `data-*` attributes (e.g. from `markAttrs`) spread onto the rendered
   * element. Lets the interactivity layer address marks without changing behavior.
   */
  dataAttrs?: Record<string, string>;
  onPointerEnter?: (event: PointerEvent<SVGElement>) => void;
  onPointerMove?: (event: PointerEvent<SVGElement>) => void;
  onPointerLeave?: (event: PointerEvent<SVGElement>) => void;
  onPointerDown?: (event: PointerEvent<SVGElement>) => void;
  onPointerUp?: (event: PointerEvent<SVGElement>) => void;
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

export interface RoughTextProps extends RoughPrimitiveProps {
  x: number;
  y: number;
  children: string;
  /** Maps to SVG `text-anchor`. */
  anchor?: 'start' | 'middle' | 'end';
  /** Maps to SVG `dominant-baseline`. */
  baseline?: 'auto' | 'middle' | 'hanging';
  /** Rotation in degrees about (x, y). */
  rotate?: number;
  /** Overrides the vibe stroke as the text fill color. */
  fill?: string;
  /**
   * Force a page-colour halo behind the glyphs (a soft knockout, not a box) so
   * the label stays legible over a fill even when the vibe has no background.
   */
  haloColor?: string;
  /** When set, wrap the text to this pixel width across multiple lines. */
  maxWidth?: number;
}
