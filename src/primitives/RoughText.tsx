import type { RoughTextProps } from '../types/primitives';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { wrapText } from '../core/text';

const BASELINE_MAP = {
  auto: 'auto',
  middle: 'central',
  hanging: 'hanging',
} as const;

const LINE_EM = 1.2;

/**
 * Vibe-aware text. The glyphs themselves aren't sketched — the vibe only swaps
 * the font family/size and supplies the fill color, so axis ticks, labels,
 * legends, and flowchart nodes all read consistently.
 */
export function RoughText({
  x,
  y,
  children,
  anchor = 'middle',
  baseline = 'middle',
  rotate,
  vibe,
  seed,
  fill,
  maxWidth,
  className,
  style,
  onClick,
}: RoughTextProps) {
  const resolved = useResolvedVibe(vibe, seed);
  const lines = maxWidth ? wrapText(children, maxWidth, resolved.fontSize, resolved.fontFamily) : null;

  // Vertically center a wrapped block by lifting the first line half its height.
  const content =
    lines && lines.length > 1
      ? lines.map((line, i) => (
          <tspan key={i} x={x} dy={`${i === 0 ? -((lines.length - 1) * LINE_EM) / 2 : LINE_EM}em`}>
            {line}
          </tspan>
        ))
      : children;

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline={BASELINE_MAP[baseline]}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      fontFamily={resolved.fontFamily}
      fontSize={resolved.fontSize}
      fill={fill ?? resolved.stroke}
      className={className}
      style={style}
      onClick={onClick}
    >
      {content}
    </text>
  );
}
