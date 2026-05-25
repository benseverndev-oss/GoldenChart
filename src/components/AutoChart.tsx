import { createElement } from 'react';
import type { ComponentType, ReactElement } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { ComponentName } from '../core/compile';
import type { Intent } from '../core/recommend';
import { profileData } from '../core/profile';
import { recommendChart } from '../core/recommend';
import { compileChart } from '../core/compile';
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
}

/**
 * The one-call entry point: profile the data, recommend a chart, compile it to
 * props, and return the rendered element. `width`/`height` (and any other chart
 * prop) come from `opts` and win over the auto-derived props.
 */
export function visualize(data: Record<string, unknown>[], opts: VisualizeOptions): ReactElement {
  const { intent, ...chartProps } = opts;
  const rec = recommendChart(profileData(data), intent)[0];
  const compiled = compileChart(data, rec);
  return createElement(REGISTRY[compiled.component], { ...compiled.props, ...chartProps });
}

export interface AutoChartProps extends BaseChartProps {
  data: Record<string, unknown>[];
  intent?: Intent;
}

/** Component form of {@link visualize}. */
export function AutoChart({ data, intent, ...rest }: AutoChartProps): ReactElement {
  return visualize(data, { intent, ...rest });
}
