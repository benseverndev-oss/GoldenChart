import { useMemo } from 'react';
import type { BaseChartProps, FlowDirection } from '../types/charts';
import type { EREntityInput, ERRelationshipInput } from '../core/er';
import { computeER } from '../core/er';
import { getPlotArea } from '../core/geometry';
import { Surface } from './Surface';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughLine } from '../primitives/RoughLine';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';

export interface ERDiagramProps extends BaseChartProps {
  entities: EREntityInput[];
  relationships?: ERRelationshipInput[];
  direction?: FlowDirection;
}

/**
 * Entity-relationship diagram: titled entity boxes with field rows, joined by
 * orthogonally routed connectors carrying cardinality markers. `computeER` does
 * the geometry; the sketch primitives draw it.
 */
export function ERDiagram({
  entities,
  relationships,
  width,
  height,
  margin,
  vibe,
  title,
  description,
  ariaLabel,
  className,
  style,
  bare,
  direction,
}: ERDiagramProps) {
  const plot = getPlotArea(width, height, margin);

  const layout = useMemo(
    () => computeER(entities, relationships ?? [], [plot.width, plot.height], { direction }),
    [entities, relationships, plot.width, plot.height, direction],
  );

  // Fit the viewBox to the entity boxes + routed relationships so the diagram
  // scales into the canvas without clipping, however wide the layout grew.
  const viewBox = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const add = (x: number, y: number): void => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    for (const e of layout.entities) {
      add(e.x - e.width / 2, e.y - e.height / 2);
      add(e.x + e.width / 2, e.y + e.height / 2);
    }
    for (const r of layout.relationships) for (const p of r.points) add(p.x, p.y);
    if (!Number.isFinite(minX)) return `0 0 ${width} ${height}`;
    const pad = 16;
    return `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;
  }, [layout, width, height]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      className={className}
      style={style}
      bare={bare}
      viewBox={viewBox}
    >
      <g>
        {layout.relationships.map((r, i) => {
          const pts = r.points;
          const d = `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map((p) => `L${p.x},${p.y}`).join(' ');
          return (
            <g key={`${r.from}->${r.to}-${i}`}>
              <RoughPath d={d} fill={null} seed={i + 1} />
              {r.fromCardinality && (
                <RoughText x={r.fromLabelAt.x} y={r.fromLabelAt.y} anchor="middle" baseline="middle">
                  {r.fromCardinality}
                </RoughText>
              )}
              {r.toCardinality && (
                <RoughText x={r.toLabelAt.x} y={r.toLabelAt.y} anchor="middle" baseline="middle">
                  {r.toCardinality}
                </RoughText>
              )}
            </g>
          );
        })}

        {layout.entities.map((e, i) => {
          const left = e.x - e.width / 2;
          const top = e.y - e.height / 2;
          return (
            <g key={e.id}>
              <RoughRectangle x={left} y={top} width={e.width} height={e.height} fill="#ffffff" seed={i + 1} />
              <RoughLine x1={left} y1={top + e.headerHeight} x2={left + e.width} y2={top + e.headerHeight} seed={i + 1} />
              <RoughText x={e.x} y={top + e.headerHeight / 2} anchor="middle" baseline="middle">
                {e.label}
              </RoughText>
              {e.rows.map((row, ri) => (
                <RoughText key={ri} x={left + 10} y={top + row.y} anchor="start" baseline="middle">
                  {row.key ? `${row.key} ${row.text}` : row.text}
                </RoughText>
              ))}
            </g>
          );
        })}
      </g>
    </Surface>
  );
}
