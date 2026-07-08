import type { ComponentName } from './compile';

export type CrosswalkComponent = ComponentName | 'ChoroplethMap';

export type CrosswalkResult =
  | { component: CrosswalkComponent; props: Record<string, unknown> }
  | { unsupported: { type: string; reason: string } };

const num = (v: unknown): number =>
  typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/,/g, '')) || 0 : 0;
const str = (v: unknown): string => String(v ?? '');
/** FusionCharts allows hex without '#'; normalize to a CSS color. */
const color = (v: unknown): string | undefined => {
  const s = str(v).trim();
  if (!s) return undefined;
  return /^[0-9a-fA-F]{6}$/.test(s) ? `#${s}` : s;
};

interface FusionInput {
  type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataSource?: any;
}

const TYPE_MAP: Record<string, ComponentName> = {
  line: 'LineChart',
  spline: 'LineChart',
  msline: 'LineChart',
  msspline: 'LineChart',
  zoomline: 'LineChart',
  column2d: 'BarChart',
  bar2d: 'BarChart',
  mscolumn2d: 'BarChart',
  msbar2d: 'BarChart',
  stackedcolumn2d: 'BarChart',
  stackedbar2d: 'BarChart',
  area2d: 'AreaChart',
  msarea2d: 'AreaChart',
  stackedarea2d: 'AreaChart',
  pie2d: 'PieChart',
  pie3d: 'PieChart',
  doughnut2d: 'PieChart',
  doughnut3d: 'PieChart',
  scatter: 'ScatterPlot',
  bubble: 'ScatterPlot',
  radar: 'RadarChart',
  heatmap: 'HeatmapChart',
  treemap: 'TreemapChart',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function config(chart: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (chart?.caption) out.title = str(chart.caption);
  return out;
}

export function fusionToGoldenChart(input: FusionInput): CrosswalkResult {
  const type = str(input?.type).toLowerCase();
  const dataSource = input?.dataSource ?? {};
  const chart = dataSource.chart ?? {};
  const cfg = config(chart);

  // Maps
  if (type.startsWith('maps/')) {
    if (type === 'maps/usa') {
      return {
        component: 'ChoroplethMap',
        props: {
          ...cfg,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: (dataSource.data ?? []).map((d: any) => ({
            region: str(d.id).toUpperCase(),
            value: num(d.value),
          })),
        },
      };
    }
    return { unsupported: { type, reason: 'only maps/usa is supported' } };
  }

  const component = TYPE_MAP[type];
  if (!component) return { unsupported: { type: type || '(none)', reason: 'no GoldenChart equivalent' } };

  switch (component) {
    case 'BarChart': {
      const mode = type.startsWith('stacked') ? 'stacked' : type.startsWith('ms') ? 'grouped' : 'single';
      if (mode === 'single') {
        return {
          component,
          props: {
            ...cfg,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: (dataSource.data ?? []).map((d: any) => ({
              label: str(d.label),
              value: num(d.value),
              color: color(d.color),
            })),
          },
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cats = (dataSource.categories?.[0]?.category ?? []).map((c: any) => str(c.label));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seriesKeys = (dataSource.dataset ?? []).map((s: any) => str(s.seriesname));
      const data = cats.map((label: string, i: number) => ({
        label,
        values: Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (dataSource.dataset ?? []).map((s: any) => [str(s.seriesname), num(s.data?.[i]?.value)]),
        ),
      }));
      return { component, props: { ...cfg, data, mode, seriesKeys } };
    }
    case 'LineChart':
    case 'AreaChart': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const series = (dataSource.dataset ?? []).map((s: any) => ({
        id: str(s.seriesname),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        points: (s.data ?? []).map((p: any, i: number) => ({ x: i, y: num(p.value) })),
      }));
      if (series.length === 0 && dataSource.data) {
        series.push({
          id: str(chart.caption) || 'series',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          points: dataSource.data.map((p: any, i: number) => ({ x: i, y: num(p.value) })),
        });
      }
      return { component, props: { ...cfg, series } };
    }
    case 'PieChart':
      return {
        component,
        props: {
          ...cfg,
          innerRadius: type.startsWith('doughnut') ? 60 : 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: (dataSource.data ?? []).map((d: any) => ({
            label: str(d.label),
            value: num(d.value),
            color: color(d.color),
          })),
        },
      };
    case 'ScatterPlot':
      return {
        component,
        props: {
          ...cfg,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: (dataSource.dataset?.[0]?.data ?? dataSource.data ?? []).map((d: any) => {
            const p: { x: number; y: number; r?: number } = { x: num(d.x), y: num(d.y) };
            if (d.z !== undefined) p.r = num(d.z);
            return p;
          }),
        },
      };
    case 'RadarChart':
    case 'HeatmapChart':
    case 'TreemapChart':
      // Supported types, but their FusionCharts data shapes differ enough that
      // v1 returns `unsupported` rather than risk a silently-wrong render.
      return { unsupported: { type, reason: `${component} crosswalk not implemented in v1` } };
    default:
      return { unsupported: { type, reason: 'no GoldenChart equivalent' } };
  }
}
