import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ERDiagram } from './ERDiagram';
import { computeER } from '../core/er';
import { renderToSVGString } from '../render/renderToString';
import type { EREntityInput, ERRelationshipInput } from '../core/er';

const ENTITIES: EREntityInput[] = [
  {
    id: 'user',
    label: 'User',
    fields: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'email', type: 'text' },
    ],
  },
  {
    id: 'order',
    label: 'Order',
    fields: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'user_id', type: 'uuid', key: 'FK' },
      { name: 'total', type: 'numeric' },
    ],
  },
];

const RELS: ERRelationshipInput[] = [
  { from: 'user', to: 'order', label: 'places', fromCardinality: '1', toCardinality: 'N' },
];

describe('computeER', () => {
  it('sizes entity boxes from fields and routes relationships', () => {
    const layout = computeER(ENTITIES, RELS, [560, 320]);
    expect(layout.entities).toHaveLength(2);
    const order = layout.entities.find((e) => e.id === 'order')!;
    // Three field rows below the header.
    expect(order.rows).toHaveLength(3);
    expect(order.rows[1].key).toBe('FK');
    // The relationship is an orthogonal polyline with both cardinalities kept.
    expect(layout.relationships).toHaveLength(1);
    const rel = layout.relationships[0];
    expect(rel.points.length).toBeGreaterThanOrEqual(2);
    expect(rel.fromCardinality).toBe('1');
    expect(rel.toCardinality).toBe('N');
  });
});

describe('ERDiagram', () => {
  it('renders entities, fields and cardinalities as standalone SVG', () => {
    const svg = renderToSVGString(
      createElement(ERDiagram, { entities: ENTITIES, relationships: RELS, width: 560, height: 320, bare: true }),
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Order');
    expect(svg).toContain('email');
    expect(svg).toContain('FK');
    expect(svg).toContain('<path');
  });
});
