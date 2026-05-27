import { createElement } from 'react';
import type { ComponentType, ReactElement } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { ComponentName } from '../core/compile';
import type { Intent } from '../core/recommend';
import { planChart } from '../core/planChart';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { ScatterPlot } from './ScatterPlot';
import { PieChart } from './PieChart';
import { HeatmapChart } from './HeatmapChart';
import { SankeyChart } from './SankeyChart';
import { TreemapChart } from './TreemapChart';
import { RadarChart } from './RadarChart';

const REGISTRY: Record<ComponentName, ComponentType<any>> = {
  BarChart,
  LineChart,
  AreaChart,
  ScatterPlot,
  PieChart,
  HeatmapChart,
  SankeyChart,
  TreemapChart,
  RadarChart,
};

export interface VisualizeOptions extends Omit<BaseChartProps, 'children'> {
  /** Steer the recommendation (trend/compare/composition/…). */
  intent?: Intent;
  /** Plain-English query — picks the chart, field roles, and vibe. Explicit props still win. */
  query?: string;
}

/**
 * The one-call entry point: profile the data, recommend a chart (optionally
 * steered by a plain-English `query`), compile it to props, and return the
 * rendered element. `width`/`height` (and any other chart prop) come from `opts`
 * and win over both the auto-derived and query-derived props.
 */
export function visualize(data: Record<string, unknown>[], opts: VisualizeOptions): ReactElement {
  const { intent, query, ...chartProps } = opts;
  const { compiled } = planChart(data, { intent, query });
  return createElement(REGISTRY[compiled.component], { ...compiled.props, ...chartProps });
}

export interface AutoChartProps extends BaseChartProps {
  data: Record<string, unknown>[];
  intent?: Intent;
  /** Plain-English query — picks the chart, field roles, and vibe. */
  query?: string;
}

/** Component form of {@link visualize}. */
export function AutoChart({ data, intent, query, ...rest }: AutoChartProps): ReactElement {
  return visualize(data, { intent, query, ...rest });
}
