import { describe, expect, it } from 'vitest';
import { fusionToGoldenChart } from './fusioncharts';

const ds = (chart: object, extra: object) => ({ chart, ...extra });

describe('fusionToGoldenChart', () => {
  it('column2d -> BarChart with coerced numeric values', () => {
    const r = fusionToGoldenChart({
      type: 'column2d',
      dataSource: ds({ caption: 'X' }, { data: [{ label: 'A', value: '10' }, { label: 'B', value: '5' }] }),
    });
    expect(r).toMatchObject({ component: 'BarChart' });
    expect((r as { props: { data: unknown } }).props.data).toEqual([
      { label: 'A', value: 10, color: undefined },
      { label: 'B', value: 5, color: undefined },
    ]);
    expect((r as { props: { title: string } }).props.title).toBe('X');
  });

  it('pie2d -> PieChart, doughnut2d -> innerRadius > 0', () => {
    expect(
      (fusionToGoldenChart({ type: 'pie2d', dataSource: ds({}, { data: [{ label: 'A', value: '1' }] }) }) as { component: string }).component,
    ).toBe('PieChart');
    const d = fusionToGoldenChart({ type: 'doughnut2d', dataSource: ds({}, { data: [{ label: 'A', value: '1' }] }) }) as { props: { innerRadius: number } };
    expect(d.props.innerRadius).toBeGreaterThan(0);
  });

  it('msline -> LineChart series joined on index', () => {
    const r = fusionToGoldenChart({
      type: 'msline',
      dataSource: ds({}, {
        categories: [{ category: [{ label: 'Jan' }, { label: 'Feb' }] }],
        dataset: [{ seriesname: 'S1', data: [{ value: '1' }, { value: '2' }] }],
      }),
    }) as { component: string; props: { series: Array<{ id: string; points: Array<{ x: number; y: number }> }> } };
    expect(r.component).toBe('LineChart');
    expect(r.props.series[0]).toMatchObject({ id: 'S1', points: [{ x: 0, y: 1 }, { x: 1, y: 2 }] });
  });

  it('bubble -> ScatterPlot with r from z', () => {
    const r = fusionToGoldenChart({
      type: 'bubble',
      dataSource: ds({}, { dataset: [{ data: [{ x: '1', y: '2', z: '3' }] }] }),
    }) as { component: string; props: { data: Array<{ x: number; y: number; r?: number }> } };
    expect(r.component).toBe('ScatterPlot');
    expect(r.props.data[0]).toMatchObject({ x: 1, y: 2, r: 3 });
  });

  it('maps/usa -> ChoroplethMap {region,value}', () => {
    const r = fusionToGoldenChart({
      type: 'maps/usa',
      dataSource: ds({}, { data: [{ id: 'CA', value: '39' }] }),
    }) as { component: string; props: { data: unknown } };
    expect(r.component).toBe('ChoroplethMap');
    expect(r.props.data).toEqual([{ region: 'CA', value: 39 }]);
  });

  it('unknown type -> structured unsupported', () => {
    const r = fusionToGoldenChart({ type: 'gauge', dataSource: ds({}, {}) }) as { unsupported: { type: string } };
    expect(r.unsupported).toMatchObject({ type: 'gauge' });
  });
});
