import type { FlowDirection, FlowNode } from '../types/charts';
import type { Point } from '../types/geometry';
import { layoutFlow } from './dag';
import { boxPort, routeOrthogonal, type Obstacle } from './routing';
import { measureText } from './text';

/**
 * Entity-relationship layout. Each entity is a titled box with a row per field;
 * boxes are positioned by the flow engine (treating relationships as edges) and
 * connectors route orthogonally around the other boxes, with cardinality labels
 * pinned near each endpoint. Pure geometry, ready for the renderer.
 */

export type ERKey = 'PK' | 'FK';

export interface ERField {
  name: string;
  type?: string;
  key?: ERKey;
}

export interface EREntityInput {
  id: string;
  label?: string;
  fields?: ERField[];
}

export interface ERRelationshipInput {
  from: string;
  to: string;
  label?: string;
  fromCardinality?: string;
  toCardinality?: string;
}

export interface ERFieldRow {
  text: string;
  key?: ERKey;
  /** Centre y of the row, relative to the entity box top. */
  y: number;
}

export interface LaidEntity {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight: number;
  rows: ERFieldRow[];
}

export interface LaidRelationship {
  from: string;
  to: string;
  label?: string;
  points: Point[];
  fromCardinality?: string;
  toCardinality?: string;
  fromLabelAt: Point;
  toLabelAt: Point;
}

export interface ERLayout {
  entities: LaidEntity[];
  relationships: LaidRelationship[];
}

export interface EROptions {
  direction?: FlowDirection;
}

const HEADER_H = 28;
const ROW_H = 20;
const PAD_X = 14;
const FONT = 13;
const FAMILY = 'sans-serif';

const fieldText = (f: ERField): string => (f.type ? `${f.name}: ${f.type}` : f.name);

const toBox = (e: LaidEntity): Obstacle => ({
  x: e.x - e.width / 2,
  y: e.y - e.height / 2,
  width: e.width,
  height: e.height,
});

export function computeER(
  entities: EREntityInput[],
  relationships: ERRelationshipInput[],
  size: [number, number],
  opts: EROptions = {},
): ERLayout {
  if (entities.length === 0) return { entities: [], relationships: [] };

  // Size every entity box from its title and field rows.
  const sized = entities.map((e) => {
    const label = e.label ?? e.id;
    const fields = e.fields ?? [];
    const labelW = measureText(label, FONT + 1, FAMILY).width;
    const fieldsW = fields.reduce((max, f) => {
      const prefix = f.key ? `${f.key} ` : '';
      return Math.max(max, measureText(prefix + fieldText(f), FONT, FAMILY).width);
    }, 0);
    const width = Math.max(90, Math.min(240, Math.ceil(Math.max(labelW, fieldsW) + PAD_X * 2)));
    const height = HEADER_H + Math.max(1, fields.length) * ROW_H;
    return { input: e, label, fields, width, height };
  });

  const flowNodes: FlowNode[] = sized.map((s) => ({
    id: s.input.id,
    label: s.label,
    width: s.width,
    height: s.height,
  }));

  const ids = new Set(flowNodes.map((n) => n.id));
  const edges = relationships
    .filter((r) => ids.has(r.from) && ids.has(r.to))
    .map((r) => ({ from: r.from, to: r.to }));

  const positioned = layoutFlow(flowNodes, size, edges, opts.direction ?? 'LR');
  const posById = new Map(positioned.nodes.map((n) => [n.id, n]));

  const laidEntities: LaidEntity[] = sized.map((s) => {
    const p = posById.get(s.input.id)!;
    const rows: ERFieldRow[] = s.fields.map((f, i) => ({
      text: fieldText(f),
      key: f.key,
      y: HEADER_H + i * ROW_H + ROW_H / 2,
    }));
    return {
      id: s.input.id,
      label: s.label,
      x: p.x,
      y: p.y,
      width: s.width,
      height: s.height,
      headerHeight: HEADER_H,
      rows,
    };
  });

  const entityById = new Map(laidEntities.map((e) => [e.id, e]));
  const obstacles = laidEntities.map(toBox);

  const laidRelationships: LaidRelationship[] = relationships.flatMap((r) => {
    const s = entityById.get(r.from);
    const t = entityById.get(r.to);
    if (!s || !t) return [];
    const sBox = toBox(s);
    const tBox = toBox(t);
    const sPort = boxPort(sBox, { x: t.x, y: t.y });
    const tPort = boxPort(tBox, { x: s.x, y: s.y });
    const others = obstacles.filter((_, i) => laidEntities[i].id !== r.from && laidEntities[i].id !== r.to);
    const points = routeOrthogonal(sPort, tPort, others, { padding: 10 });
    const near = (port: Point, next: Point): Point => ({
      x: port.x + (next.x - port.x) * 0.28,
      y: port.y + (next.y - port.y) * 0.28 - 6,
    });
    return [
      {
        from: r.from,
        to: r.to,
        label: r.label,
        points,
        fromCardinality: r.fromCardinality,
        toCardinality: r.toCardinality,
        fromLabelAt: near(sPort, points[1] ?? tPort),
        toLabelAt: near(tPort, points[points.length - 2] ?? sPort),
      },
    ];
  });

  return { entities: laidEntities, relationships: laidRelationships };
}
