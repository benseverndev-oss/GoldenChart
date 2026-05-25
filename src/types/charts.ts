import type { CSSProperties, ReactNode } from 'react';
import type { Margin } from './geometry';
import type { VibeConfig } from './vibe';

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
}

/** A tabular mirror of a chart's data, rendered visually-hidden for screen readers. */
export interface DataTableModel {
  caption?: string;
  columns: string[];
  rows: (string | number)[][];
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
}

/** Tree layout direction: Top-Bottom, Bottom-Top, Left-Right, Right-Left. */
export type FlowDirection = 'TB' | 'BT' | 'LR' | 'RL';

/** Edge connector style: smooth cubic `curved` links or `orthogonal` elbows. */
export type EdgeRouting = 'curved' | 'orthogonal';
