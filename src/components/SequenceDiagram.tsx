import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { SequenceActorInput, SequenceMessageInput } from '../core/sequence';
import { computeSequence, SELF_LOOP_WIDTH } from '../core/sequence';
import { getPlotArea } from '../core/geometry';
import { arrowHeadPath } from '../core/shapes';
import { Surface } from './Surface';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughLine } from '../primitives/RoughLine';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';

export interface SequenceDiagramProps extends BaseChartProps {
  actors: SequenceActorInput[];
  messages: SequenceMessageInput[];
  actorHeight?: number;
}

const DASHED = { strokeDasharray: '6 4' } as const;
const SELF_LOOP_HEIGHT = 18;

/**
 * Sequence / interaction diagram: actors across the top, lifelines running
 * down, and messages as ordered horizontal arrows between them (reply messages
 * dashed, self-messages looping back). `computeSequence` does the geometry; the
 * sketch primitives draw it.
 */
export function SequenceDiagram({
  actors,
  messages,
  width,
  height,
  margin,
  vibe,
  brand,
  title,
  description,
  ariaLabel,
  className,
  style,
  bare,
  actorHeight,
}: SequenceDiagramProps) {
  const plot = getPlotArea(width, height, margin);

  const layout = useMemo(
    () => computeSequence(actors, messages, [plot.width, plot.height], { actorHeight }),
    [actors, messages, plot.width, plot.height, actorHeight],
  );

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      brand={brand}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      className={className}
      style={style}
      bare={bare}
    >
      <g transform={`translate(${plot.x}, ${plot.y})`}>
        {layout.actors.map((a, i) => (
          <g key={a.id}>
            <RoughLine
              x1={a.x}
              y1={a.lifelineTop}
              x2={a.x}
              y2={a.lifelineBottom}
              style={DASHED}
              seed={i + 1}
            />
            <RoughRectangle
              x={a.boxX}
              y={a.boxY}
              width={a.boxWidth}
              height={a.boxHeight}
              fill="#ffffff"
              seed={i + 1}
            />
            <RoughText x={a.x} y={a.boxY + a.boxHeight / 2} anchor="middle" baseline="middle">
              {a.label}
            </RoughText>
          </g>
        ))}

        {layout.messages.map((m, i) => {
          const key = `${m.from}->${m.to}-${i}`;
          if (m.self) {
            const x = m.x1;
            // Clamp the loop so it stays well within the actor's own column and
            // can't reach the next lifeline to the right.
            const rightX = layout.actors
              .map((a) => a.x)
              .filter((ax) => ax > x + 1)
              .sort((a, b) => a - b)[0];
            const loopW = rightX != null ? Math.min(SELF_LOOP_WIDTH, (rightX - x) * 0.32) : SELF_LOOP_WIDTH;
            const yb = m.y + SELF_LOOP_HEIGHT;
            const d = `M${x},${m.y} L${x + loopW},${m.y} L${x + loopW},${yb} L${x},${yb}`;
            return (
              <g key={key}>
                <RoughPath d={d} fill={null} style={m.dashed ? DASHED : undefined} seed={i + 1} />
                <RoughPath d={arrowHeadPath({ x: x + loopW, y: yb }, { x, y: yb })} fill={null} />
                {m.label && (
                  // Label sits above the loop (centred over it), so it stays in
                  // the column and never crosses the neighbouring lifeline.
                  <RoughText x={x + loopW / 2} y={m.y - 6} anchor="middle" baseline="auto">
                    {m.label}
                  </RoughText>
                )}
              </g>
            );
          }
          return (
            <g key={key}>
              <RoughLine x1={m.x1} y1={m.y} x2={m.x2} y2={m.y} style={m.dashed ? DASHED : undefined} seed={i + 1} />
              <RoughPath d={arrowHeadPath({ x: m.x1, y: m.y }, { x: m.x2, y: m.y })} fill={null} />
              {m.label && (
                <RoughText x={(m.x1 + m.x2) / 2} y={m.y - 7} anchor="middle" baseline="auto">
                  {m.label}
                </RoughText>
              )}
            </g>
          );
        })}
      </g>
    </Surface>
  );
}
