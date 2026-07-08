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

// Brand engine
export {
  resolveBrand,
  brandVibeOverrides,
  BrandProvider,
  useBrand,
  useColorScheme,
  useResolvedBrand,
} from './brand';
export type { BrandProviderProps } from './brand';

// Calculation layer (D3, DOM-free)
export * from './core';

// Rendering primitives (Rough.js)
export { RoughPath, RoughLine, RoughRectangle, RoughCircle, RoughText } from './primitives';
export { getRoughGenerator, drawableToPaths } from './render/roughGenerator';
export type { RoughPathInfo } from './render/roughGenerator';

// Client-side export helpers (SVG/PNG/clipboard). Browser-only.
export {
  toSvgString,
  toPng,
  downloadChart,
  copyToClipboard,
  chartSvgFrom,
  svgPixelSize,
  extensionFor,
  mimeFor,
} from './render/clientExport';
export type { ExportFormat, ToPngOptions, DownloadOptions } from './render/clientExport';

// High-level components
export {
  Surface,
  ResponsiveContainer,
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
  SequenceDiagram,
  ERDiagram,
  Timeline,
  renderDiagram,
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
  Badge,
  BADGE_TONES,
  BADGE_ICONS,
  isBadgeTone,
  isBadgeIcon,
} from './components';
export type {
  SurfaceProps,
  ResponsiveContainerProps,
  ResponsiveSize,
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
  SequenceDiagramProps,
  ERDiagramProps,
  TimelineProps,
  DiagramRenderOptions,
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
  BadgeProps,
  BadgeTone,
  BadgeIcon,
} from './components';

// FusionCharts → GoldenChart crosswalk (pure). ChoroplethMap itself is exported
// from `goldenchart/server` (geometry must stay off the browser entry).
export { fusionToGoldenChart } from './core/fusioncharts';
export type { CrosswalkResult, CrosswalkComponent } from './core/fusioncharts';
