import { describe, it, expect } from 'vitest';
import {
  describeBars,
  describeDiagram,
  describeER,
  describePie,
  describeSankey,
  describeScatter,
  describeSeries,
} from './a11yDescribe';

describe('a11yDescribe', () => {
  it('describes single-series bars with category count and value range', () => {
    expect(
      describeBars([
        { label: 'Q1', value: 12 },
        { label: 'Q2', value: 19 },
        { label: 'Q3', value: 7 },
        { label: 'Q4', value: 24 },
      ]),
    ).toBe('Bar chart with 4 categories, values from 7 to 24.');
  });

  it('handles a single category (singular noun)', () => {
    expect(describeBars([{ label: 'Only', value: 5 }])).toBe('Bar chart with 1 category, value 5.');
  });

  it('describes multi-series bars with series count', () => {
    expect(
      describeBars([
        { label: 'Q1', values: { a: 1, b: 2 } },
        { label: 'Q2', values: { a: 3, b: 4 } },
      ]),
    ).toBe('Bar chart with 2 categories across 2 series, values from 1 to 4.');
  });

  it('returns a usable string for empty bars', () => {
    expect(describeBars([])).toBe('Bar chart with no data.');
  });

  it('describes line/area series with total point count', () => {
    expect(
      describeSeries(
        [
          {
            id: 'a',
            points: [
              { x: 0, y: 1 },
              { x: 1, y: 5 },
            ],
          },
          {
            id: 'b',
            points: [
              { x: 0, y: -3 },
              { x: 1, y: 2 },
            ],
          },
        ],
        'Line',
      ),
    ).toBe('Line chart with 2 series and 4 points, y values from -3 to 5.');
  });

  it('respects the Area kind label', () => {
    expect(describeSeries([{ id: 'a', points: [{ x: 0, y: 1 }] }], 'Area')).toBe(
      'Area chart with 1 series and 1 point, y value 1.',
    );
  });

  it('describes pies with slice count and total', () => {
    expect(
      describePie([
        { label: 'A', value: 30 },
        { label: 'B', value: 20 },
        { label: 'C', value: 10 },
      ]),
    ).toBe('Pie chart with 3 slices totaling 60.');
  });

  it('formats non-integer values with up to two decimals, trimmed', () => {
    expect(describePie([{ label: 'A', value: 1.5 }])).toBe('Pie chart with 1 slice totaling 1.5.');
  });

  it('describes scatter data with point count', () => {
    expect(
      describeScatter([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 4 },
      ]),
    ).toBe('Scatter plot with 3 points.');
  });

  it('handles empty inputs across all generators', () => {
    expect(describeSeries([])).toBe('Line chart with no data.');
    expect(describePie([])).toBe('Pie chart with no data.');
    expect(describeScatter([])).toBe('Scatter plot with no data.');
  });

  it('describes diagrams with node and edge counts (flowchart/org/mindmap/arch)', () => {
    const nodes = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    expect(
      describeDiagram(nodes, [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ]),
    ).toBe('Diagram with 3 nodes and 2 edges.');
    // Singular nouns + missing edges array.
    expect(describeDiagram([{ id: 'a', label: 'A' }])).toBe('Diagram with 1 node and 0 edges.');
    expect(describeDiagram([], [])).toBe('Diagram with no nodes.');
  });

  it('describes ER diagrams with entity and relationship counts', () => {
    expect(describeER([{ name: 'User' }, { name: 'Order' }], [{ from: 'User', to: 'Order' }])).toBe(
      'Entity-relationship diagram with 2 entities and 1 relationship.',
    );
    expect(describeER([], [])).toBe('Entity-relationship diagram with no entities.');
  });

  it('describes Sankey diagrams with node and link counts', () => {
    expect(
      describeSankey([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b', value: 5 }]),
    ).toBe('Sankey diagram with 3 nodes and 1 link.');
    expect(describeSankey([], [])).toBe('Sankey diagram with no nodes.');
  });
});
