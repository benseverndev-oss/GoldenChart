import type { CSSProperties, ReactNode } from 'react';
import type { Margin } from './geometry';
import type { VibeConfig } from './vibe';
import type { BrandConfig } from './brand';

/** A single (category, value) datum for the standard cartesian charts. */
export interface ChartDatum {
  label: string;
  value: number;
  /** Optional per-datum color; falls back to the vibe stroke/fill. */
  color?: string;
}

/** A point series for line/scatter charts. */
export interface SeriesPoint {
  x: number;
  y: number;
}

export interface Series {
  id: string;
  points: SeriesPoint[];
  color?: string;
}

/** A category with one value per series — for grouped/stacked bar charts. */
export interface MultiSeriesDatum {
  label: string;
  values: Record<string, number>;
}

/**
 * Props shared by every high-level chart component. Charts own the outer SVG
 * surface, the margins, and the vibe; the calculation layer turns this into
 * coordinates and the primitives draw them.
 */
export interface BaseChartProps {
  width: number;
  height: number;
  /** Defaults applied per-chart; see `core/geometry.ts#resolveMargin`. */
  margin?: Partial<Margin>;
  /** Aesthetic for the whole chart. Provided to descendants via context. */
  vibe?: VibeConfig;
  /**
   * Brand identity (palette, primary/ink/page colours, font, logo) layered on
   * top of the vibe. Recolours the chart while the vibe keeps the hand-drawn
   * feel; explicit `vibe` overrides still win over the brand.
   */
  brand?: BrandConfig;
  /** Accessible label rendered as `<title>` / aria-label on the surface. */
  title?: string;
  /** Longer accessible description, rendered as `<desc>`. */
  description?: string;
  /** Explicit aria-label; falls back to `title`. */
  ariaLabel?: string;
  /** Emit a visually-hidden data table mirroring the chart, for screen readers. */
  dataTable?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** Render only the bare `<svg>` (no wrapper div) for headless/SVG-string use. */
  bare?: boolean;
  /**
   * Opt-in enter/update transitions when the chart's data prop changes. Off
   * by default so existing renders are byte-identical; honours
   * `prefers-reduced-motion` (snaps to the new state instead of tweening).
   */
  transitions?: {
    enabled?: boolean;
    /** Tween length in ms. Default 400. */
    durationMs?: number;
  };
}

/** A tabular mirror of a chart's data, rendered visually-hidden for screen readers. */
export interface DataTableModel {
  caption?: string;
  columns: string[];
  rows: (string | number)[][];
}

/**
 * Per-axis scale + formatting controls. All optional; omit to keep a chart's
 * defaults. `format`/`unit` drive tick labels (see `core/format.ts#formatValue`);
 * `domain` overrides the numeric extent (`'zero'` forces a zero baseline).
 */
export interface AxisFormat {
  scale?: 'linear' | 'log' | 'time';
  domain?: [number, number] | 'nice' | 'zero';
  tickCount?: number;
  /** d3-ish number spec (e.g. `',.0f'`, `'$.2s'`) or strftime pattern (`'%b %Y'`). */
  format?: string;
  unit?: string;
}

export type FlowNodeShape = 'rect' | 'ellipse' | 'diamond';

/** A flowchart node prior to layout. */
export interface FlowNode {
  id: string;
  label: string;
  /** Parent id for tree layouts; omit for the root. */
  parent?: string;
  width?: number;
  height?: number;
  shape?: FlowNodeShape;
  /** Optional container/subgraph this node belongs to (for grouped diagrams). */
  group?: string;
  vibe?: VibeConfig;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  /** Override the chart-level routing for just this edge. */
  routing?: EdgeRouting;
}

/** Tree layout direction: Top-Bottom, Bottom-Top, Left-Right, Right-Left. */
export type FlowDirection = 'TB' | 'BT' | 'LR' | 'RL';

/**
 * Structural layout dials for diagrams. All optional; omit to keep current
 * defaults (which stay byte-identical). `density` scales spacing; explicit
 * `nodeSpacing`/`rankSpacing` win over it. `engine` overrides the auto
 * tree-vs-DAG pick; `laneGutter` tunes the architecture swimlane title gutter.
 */
export interface LayoutOptions {
  density?: 'compact' | 'cozy' | 'comfortable';
  nodeSpacing?: number;
  rankSpacing?: number;
  engine?: 'auto' | 'tree' | 'dag';
  laneGutter?: number;
}

/** Edge connector style: smooth cubic `curved` links or `orthogonal` elbows. */
export type EdgeRouting = 'curved' | 'orthogonal';
