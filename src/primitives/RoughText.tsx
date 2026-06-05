import type { RoughTextProps } from '../types/primitives';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { measureText, wrapText } from '../core/text';

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
  knockout,
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
  const lines = maxWidth
    ? wrapText(children, maxWidth, resolved.fontSize, resolved.fontFamily)
    : null;

  // Paint a halo in the page colour behind the glyphs so labels stay legible on
  // dark/textured backgrounds and over hachure fills. `paint-order: stroke`
  // keeps the stroke behind the fill, so it reads as a knockout, not an outline.
  // Callers can force one (`haloColor`) where the vibe has no background but the
  // label still sits over a fill — e.g. pie slices.
  // A `knockout` box already covers the glyphs, so skip the per-glyph halo —
  // doubling them up just bleeds the stroke past the rect edge.
  const halo = knockout ? undefined : (haloColor ?? resolved.background);
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

  const knockoutRect = knockout
    ? buildKnockoutRect({
        x,
        y,
        lines: lines ?? [children],
        anchor,
        baseline,
        fontSize: resolved.fontSize,
        fontFamily: resolved.fontFamily,
        color: typeof knockout === 'string' ? knockout : (resolved.background ?? '#ffffff'),
      })
    : null;

  const text = (
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

  if (!knockoutRect) return text;
  return (
    <g>
      {knockoutRect}
      {text}
    </g>
  );
}

/**
 * Build the solid knockout rect sized to the label's measured box. The box is
 * positioned to match the text's anchor (horizontal) and baseline (vertical);
 * multi-line wrapped blocks are centred on `y`, mirroring the tspan layout.
 */
function buildKnockoutRect({
  x,
  y,
  lines,
  anchor,
  baseline,
  fontSize,
  fontFamily,
  color,
}: {
  x: number;
  y: number;
  lines: string[];
  anchor: 'start' | 'middle' | 'end';
  baseline: 'auto' | 'middle' | 'hanging';
  fontSize: number;
  fontFamily: string;
  color: string;
}) {
  const width = lines.reduce(
    (max, line) => Math.max(max, measureText(line, fontSize, fontFamily).width),
    0,
  );
  const lineHeight = fontSize * LINE_EM;
  const blockHeight = Math.max(1, lines.length) * lineHeight;
  const padX = fontSize * 0.18;
  const padY = fontSize * 0.06;

  const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;

  // Multi-line blocks are vertically centred on `y` regardless of baseline (the
  // tspan layout lifts the first line). Single lines follow their baseline.
  let top: number;
  if (lines.length > 1) top = y - blockHeight / 2;
  else if (baseline === 'middle') top = y - lineHeight / 2;
  else if (baseline === 'hanging') top = y;
  else top = y - fontSize * 0.8; // alphabetic baseline sits near the bottom

  return (
    <rect
      x={left - padX}
      y={top - padY}
      width={width + padX * 2}
      height={blockHeight + padY * 2}
      fill={color}
      stroke="none"
    />
  );
}
