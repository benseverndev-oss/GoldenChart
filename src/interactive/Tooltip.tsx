import type { ReactNode } from 'react';
import type { MarkMeta } from '../types/interaction';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughText } from '../primitives/RoughText';
import { defaultTooltipFormat, type TooltipContent } from './defaultTooltipFormat';

export type TooltipRenderer = (mark: MarkMeta) => ReactNode;

export interface TooltipProps {
  mark: MarkMeta;
  x: number;
  y: number;
  format?: (mark: MarkMeta) => TooltipContent;
}

const PAD = 6;
const LINE = 14;
const CHAR_W = 7;

/** A sketched, vibe-aware tooltip frame + text. Inherits vibe from the nearest
 *  VibeProvider (seeded by InteractiveChart) and is non-interactive itself. */
export function Tooltip({ mark, x, y, format = defaultTooltipFormat }: TooltipProps) {
  const { title, rows } = format(mark);
  const lines = [...(title ? [title] : []), ...rows.map(([k, v]) => `${k}: ${v}`)];
  const width = PAD * 2 + Math.max(...lines.map((l) => l.length)) * CHAR_W;
  const height = PAD * 2 + lines.length * LINE;
  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none" aria-hidden="true">
      <RoughRectangle x={0} y={0} width={width} height={height} />
      {lines.map((line, i) => (
        <RoughText key={i} x={PAD} y={PAD + LINE * (i + 0.7)} anchor="start" baseline="middle">
          {line}
        </RoughText>
      ))}
    </g>
  );
}
