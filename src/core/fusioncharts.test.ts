import { describe, expect, it } from 'vitest';
import { fusionToGoldenChart, type CrosswalkResult } from './fusioncharts';

const ds = (chart: object, extra: object) => ({ chart, ...extra });

/** Narrow a crosswalk result to the rendered-chart variant (fails the test otherwise). */
function chart(r: CrosswalkResult): { component: string; props: Record<string, unknown> } {
  if ('unsupported' in r) throw new Error(`expected a chart, got unsupported: ${r.unsupported.type}`);
  return r;
}

describe('fusionToGoldenChart', () => {
  it('column2d -> BarChart with coerced numeric values', () => {
    const r = chart(
      fusionToGoldenChart({
        type: 'column2d',
        dataSource: ds({ caption: 'X' }, { data: [{ label: 'A', value: '10' }, { label: 'B', value: '5' }] }),
      }),
    );
    expect(r.component).toBe('BarChart');
    expect(r.props.data).toEqual([
      { label: 'A', value: 10, color: undefined },
      { label: 'B', value: 5, color: undefined },
    ]);
    expect(r.props.title).toBe('X');
  });

  it('pie2d -> PieChart, doughnut2d -> innerRadius > 0', () => {
    expect(chart(fusionToGoldenChart({ type: 'pie2d', dataSource: ds({}, { data: [{ label: 'A', value: '1' }] }) })).component).toBe('PieChart');
    const d = chart(fusionToGoldenChart({ type: 'doughnut2d', dataSource: ds({}, { data: [{ label: 'A', value: '1' }] }) }));
    expect(d.props.innerRadius as number).toBeGreaterThan(0);
  });

  it('msline -> LineChart series joined on index', () => {
    const r = chart(
      fusionToGoldenChart({
        type: 'msline',
        dataSource: ds({}, {
          categories: [{ category: [{ label: 'Jan' }, { label: 'Feb' }] }],
          dataset: [{ seriesname: 'S1', data: [{ value: '1' }, { value: '2' }] }],
        }),
      }),
    );
    expect(r.component).toBe('LineChart');
    expect((r.props.series as unknown[])[0]).toMatchObject({ id: 'S1', points: [{ x: 0, y: 1 }, { x: 1, y: 2 }] });
  });

  it('bubble -> ScatterPlot with r from z', () => {
    const r = chart(
      fusionToGoldenChart({ type: 'bubble', dataSource: ds({}, { dataset: [{ data: [{ x: '1', y: '2', z: '3' }] }] }) }),
    );
    expect(r.component).toBe('ScatterPlot');
    expect((r.props.data as unknown[])[0]).toMatchObject({ x: 1, y: 2, r: 3 });
  });

  it('maps/usa -> ChoroplethMap {region,value}', () => {
    const r = chart(fusionToGoldenChart({ type: 'maps/usa', dataSource: ds({}, { data: [{ id: 'CA', value: '39' }] }) }));
    expect(r.component).toBe('ChoroplethMap');
    expect(r.props.data).toEqual([{ region: 'CA', value: 39 }]);
  });

  it('unknown type -> structured unsupported', () => {
    const r = fusionToGoldenChart({ type: 'gauge', dataSource: ds({}, {}) });
    expect('unsupported' in r && r.unsupported).toMatchObject({ type: 'gauge' });
  });
});
