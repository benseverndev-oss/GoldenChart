import type { RoughTextProps } from '../types/primitives';
import { useResolvedVibe } from '../vibe/VibeProvider';

const BASELINE_MAP = {
  auto: 'auto',
  middle: 'central',
  hanging: 'hanging',
} as const;

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
  className,
  style,
  onClick,
}: RoughTextProps) {
  const resolved = useResolvedVibe(vibe, seed);

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
      {children}
    </text>
  );
}
