import type { ChartRecommendation } from './recommend';

/**
 * Compile a (data, recommendation) pair into concrete props for the matching
 * chart component — including reshaping raw records into the component's data
 * structure. Pure: no rendering, just data shaping.
 */

export type ComponentName =
  | 'BarChart'
  | 'LineChart'
  | 'AreaChart'
  | 'ScatterPlot'
  | 'PieChart'
  | 'HeatmapChart'
  | 'SankeyChart'
  | 'TreemapChart'
  | 'RadarChart';

export interface CompiledChart {
  component: ComponentName;
  props: Record<string, unknown>;
}

type Row = Record<string, unknown>;

const num = (v: unknown): number =>
  typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) || Number(v) || 0 : 0;
const str = (v: unknown): string => String(v ?? '');

function groupBy(rows: Row[], key: string): Map<string, Row[]> {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const k = str(r[key]);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

export function compileChart(data: Row[], rec: ChartRecommendation): CompiledChart {
  const e = rec.encoding;

  switch (rec.chartType) {
    case 'line':
    case 'area': {
      const component = rec.chartType === 'line' ? 'LineChart' : 'AreaChart';
      // Line/area need a numeric x. Numbers and parseable dates map directly; a
      // categorical x (e.g. month names) would all coerce to 0, so fall back to
      // the category's position so the line actually spreads across the axis.
      const xNumeric = data.every((r) => {
        const v = r[e.x];
        return typeof v === 'number' || (typeof v === 'string' && !Number.isNaN(Date.parse(v)));
      });
      const order = [...new Set(data.map((r) => str(r[e.x])))];
      const xOf = (r: Row) => (xNumeric ? num(r[e.x]) : order.indexOf(str(r[e.x])));
      const series = e.series
        ? [...groupBy(data, e.series)].map(([id, rows]) => ({
            id,
            points: rows.map((r) => ({ x: xOf(r), y: num(r[e.y]) })),
          }))
        : [{ id: e.y, points: data.map((r) => ({ x: xOf(r), y: num(r[e.y]) })) }];
      return { component, props: { series, title: `${e.y} by ${e.x}` } };
    }

    case 'scatter':
      return {
        component: 'ScatterPlot',
        props: {
          data: data.map((r) => ({ x: num(r[e.x]), y: num(r[e.y]) })),
          title: `${e.y} vs ${e.x}`,
        },
      };

    case 'pie':
      return {
        component: 'PieChart',
        props: {
          data: data.map((r) => ({ label: str(r[e.label]), value: num(r[e.value]) })),
          title: e.value,
        },
      };

    case 'bar': {
      if (e.series) {
        const keys = [...new Set(data.map((r) => str(r[e.series])))];
        const byX = groupBy(data, e.x);
        const multi = [...byX].map(([label, rows]) => ({
          label,
          values: Object.fromEntries(rows.map((r) => [str(r[e.series]), num(r[e.y])])),
        }));
        return {
          component: 'BarChart',
          props: { data: multi, mode: 'grouped', seriesKeys: keys, title: `${e.y} by ${e.x}` },
        };
      }
      return {
        component: 'BarChart',
        props: {
          data: data.map((r) => ({ label: str(r[e.x]), value: num(r[e.y]) })),
          title: `${e.y} by ${e.x}`,
        },
      };
    }

    case 'sankey':
      return {
        component: 'SankeyChart',
        props: {
          nodes: [...new Set(data.flatMap((r) => [str(r[e.source]), str(r[e.target])]))].map(
            (id) => ({ id }),
          ),
          links: data.map((r) => ({
            source: str(r[e.source]),
            target: str(r[e.target]),
            value: num(r[e.value]),
          })),
        },
      };

    case 'treemap':
      return {
        component: 'TreemapChart',
        props: {
          data: data.map((r) => ({
            id: str(r[e.id]),
            parent: r[e.parent] != null ? str(r[e.parent]) : undefined,
            value: e.value ? num(r[e.value]) : undefined,
            label: str(r[e.id]),
          })),
        },
      };

    case 'radar': {
      const axes = (e.axes ?? '').split(',').filter(Boolean);
      const series = data.map((r) => ({ id: str(r[e.group]), values: axes.map((a) => num(r[a])) }));
      return { component: 'RadarChart', props: { axes, series } };
    }

    case 'heatmap': {
      // Melt the numeric columns of a matrix into (x, y=column, value) cells.
      const xField = e.x;
      const valueCols = Object.keys(data[0] ?? {}).filter(
        (k) => k !== xField && typeof data[0]?.[k] === 'number',
      );
      const cells = data.flatMap((r) =>
        valueCols.map((col) => ({ x: str(r[xField]), y: col, value: num(r[col]) })),
      );
      return { component: 'HeatmapChart', props: { data: cells } };
    }
  }
}
