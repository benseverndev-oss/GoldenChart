import type { ReactNode } from 'react';
import type { MarkMeta } from '../types/interaction';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughText } from '../primitives/RoughText';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { placeTooltip } from './placeTooltip';
import { defaultTooltipFormat, type TooltipContent } from './defaultTooltipFormat';

export type TooltipRenderer = (mark: MarkMeta) => ReactNode;

export interface TooltipProps {
  mark: MarkMeta;
  /** Mark anchor in svg/viewBox coordinates. */
  anchor: { x: number; y: number };
  /** Plot bounds (viewBox width/height) for edge-flipping + clamping. */
  bounds: { width: number; height: number };
  format?: (mark: MarkMeta) => TooltipContent;
}

const PAD = 7;
const LINE = 15;
const CHAR_W = 7;

/**
 * A sketched, vibe-aware tooltip: a solid page-coloured backing (for legibility
 * over the chart) under a sketched frame, placed beside the mark via
 * `placeTooltip` so it never sits on the mark or runs off the canvas.
 */
export function Tooltip({ mark, anchor, bounds, format = defaultTooltipFormat }: TooltipProps) {
  const resolved = useResolvedVibe();
  const { title, rows } = format(mark);
  const lines = [...(title ? [title] : []), ...rows.map(([k, v]) => `${k}: ${v}`)];
  const width = PAD * 2 + Math.max(0, ...lines.map((l) => l.length)) * CHAR_W;
  const height = PAD * 2 + lines.length * LINE;
  const { x, y } = placeTooltip(anchor, { width, height }, bounds);
  const bg = resolved.background ?? '#ffffff';
  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none" aria-hidden="true">
      <rect x={0} y={0} width={width} height={height} rx={4} fill={bg} opacity={0.92} />
      <RoughRectangle x={0} y={0} width={width} height={height} fill={null} />
      {lines.map((line, i) => (
        <RoughText
          key={i}
          x={PAD}
          y={PAD + LINE * (i + 0.7)}
          anchor="start"
          baseline="middle"
          haloColor={bg}
        >
          {line}
        </RoughText>
      ))}
    </g>
  );
}
