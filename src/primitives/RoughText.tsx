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
  haloColor,
  maxWidth,
  className,
  style,
  onClick,
  dataAttrs,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
}: RoughTextProps) {
  const resolved = useResolvedVibe(vibe, seed);
  const lines = maxWidth ? wrapText(children, maxWidth, resolved.fontSize, resolved.fontFamily) : null;

  // Paint a halo in the page colour behind the glyphs so labels stay legible on
  // dark/textured backgrounds and over hachure fills. `paint-order: stroke`
  // keeps the stroke behind the fill, so it reads as a knockout, not an outline.
  // Callers can force one (`haloColor`) where the vibe has no background but the
  // label still sits over a fill — e.g. pie slices.
  const halo = haloColor ?? resolved.background;
  const haloWidth = halo ? Math.max(2, resolved.fontSize * 0.18) : undefined;

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
      stroke={halo}
      strokeWidth={haloWidth}
      strokeLinejoin="round"
      paintOrder={halo ? 'stroke' : undefined}
      textRendering="geometricPrecision"
      className={className}
      style={style}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      {...dataAttrs}
    >
      {content}
    </text>
  );
}
