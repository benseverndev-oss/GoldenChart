// Types
export * from './types';

// Vibe engine
export {
  VIBE_PRESETS,
  DEFAULT_VIBE,
  resolveVibe,
  vibeToRoughOptions,
  VibeProvider,
  useVibeContext,
  useResolvedVibe,
} from './vibe';
export type { VibeProviderProps } from './vibe';

// Calculation layer (D3, DOM-free)
export * from './core';

// Rendering primitives (Rough.js)
export { RoughPath, RoughLine, RoughRectangle, RoughCircle, RoughText } from './primitives';
export { getRoughGenerator, drawableToPaths } from './render/roughGenerator';
export type { RoughPathInfo } from './render/roughGenerator';

// High-level components
export {
  Surface,
  BarChart,
  LineChart,
  AreaChart,
  ScatterPlot,
  PieChart,
  Flowchart,
  Diagram,
  MindMap,
  OrgChart,
  ArchitectureDiagram,
  SankeyChart,
  TreemapChart,
  HeatmapChart,
  RadarChart,
  Axis,
  Grid,
  Legend,
  Annotations,
  AutoChart,
  visualize,
} from './components';
export type {
  SurfaceProps,
  BarChartProps,
  BarMode,
  LineChartProps,
  AreaChartProps,
  ScatterPlotProps,
  ScatterDatum,
  PieChartProps,
  FlowchartProps,
  DiagramProps,
  MindMapProps,
  OrgChartProps,
  ArchitectureDiagramProps,
  SankeyChartProps,
  TreemapChartProps,
  HeatmapChartProps,
  HeatmapDatum,
  RadarChartProps,
  RadarSeries,
  AxisProps,
  AxisOrientation,
  GridProps,
  LegendProps,
  LegendItem,
  AnnotationsProps,
  Annotation,
  AutoChartProps,
  VisualizeOptions,
} from './components';
