import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughText } from '../primitives/RoughText';

export interface LegendItem {
  label: string;
  color: string;
}

export interface LegendProps {
  items: LegendItem[];
  x: number;
  y: number;
  swatchSize?: number;
  rowHeight?: number;
}

/** Vibe-aware legend: a sketchy swatch + label per row. */
export function Legend({ items, x, y, swatchSize = 14, rowHeight = 22 }: LegendProps) {
  return (
    <g>
      {items.map((item, i) => {
        const rowY = y + i * rowHeight;
        return (
          <g key={item.label}>
            <RoughRectangle
              x={x}
              y={rowY}
              width={swatchSize}
              height={swatchSize}
              fill={item.color}
              seed={i + 1}
            />
            <RoughText x={x + swatchSize + 6} y={rowY + swatchSize / 2} anchor="start" baseline="middle">
              {item.label}
            </RoughText>
          </g>
        );
      })}
    </g>
  );
}
