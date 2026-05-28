import { resolveBrand } from '../brand';
import { resolveVibe } from '../vibe';
import type { BrandConfig } from '../types/brand';
import type { VibeConfig } from '../types/vibe';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';
import { measureText } from '../core/text';
import {
  BADGE_ICON_PATHS,
  BADGE_TONE_COLORS,
  type BadgeIcon,
  type BadgeTone,
} from '../core/badgeIcons';

/**
 * Intrinsic-SVG GitHub-style badge: `[icon] label │ value` in a rounded pill.
 *
 * Renders without a `<Surface>` and without reading brand/vibe from React
 * context. Brand and vibe are resolved in the body, so the badge can be dropped
 * into any markdown / README / chart row at its own size. See CLAUDE.md's
 * "brand-without-context" pattern.
 */

const HEIGHT = 26;
const PAD_X = 8;
const ICON_SIZE = 16;
const ICON_GAP = 6;
const DIVIDER_GAP = 8;
const DIVIDER_W = 1;

export interface BadgeProps {
  label: string;
  value: string;
  /** Default `'neutral'`. */
  tone?: BadgeTone;
  icon?: BadgeIcon;
  vibe?: VibeConfig;
  brand?: BrandConfig;
  seed?: number;
  className?: string;
}

/** Build an SVG path `d` for a rounded rectangle (open subpath closed via `Z`). */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return (
    `M${x + rr},${y}` +
    `H${x + w - rr}` +
    `A${rr},${rr} 0 0 1 ${x + w},${y + rr}` +
    `V${y + h - rr}` +
    `A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}` +
    `H${x + rr}` +
    `A${rr},${rr} 0 0 1 ${x},${y + h - rr}` +
    `V${y + rr}` +
    `A${rr},${rr} 0 0 1 ${x + rr},${y}` +
    `Z`
  );
}

export function Badge({
  label,
  value,
  tone = 'neutral',
  icon,
  vibe,
  brand,
  seed,
  className,
}: BadgeProps) {
  // Resolve brand + vibe directly in the body (no provider context). The
  // resolved vibe carries the effective stroke/font/fontSize after the brand's
  // ink/font knobs are layered onto whatever preset the caller chose.
  const b = resolveBrand(brand);
  const v = resolveVibe(vibe, b.vibeOverrides);
  const ink = v.stroke;
  const font = v.fontFamily;
  const fontSize = v.fontSize;

  const labelW = measureText(label, fontSize, font).width;
  const valueW = measureText(value, fontSize, font).width;
  const iconW = icon ? ICON_SIZE + ICON_GAP : 0;
  const dividerX = PAD_X + iconW + labelW + DIVIDER_GAP;
  const valueX = dividerX + DIVIDER_W + DIVIDER_GAP;
  // Math.ceil so the row tool's integer-only regex can parse the width.
  const width = Math.ceil(valueX + valueW + PAD_X);

  // Tone → value fill colour.
  const valueFill =
    tone === 'neutral'
      ? b.palette[0]
      : tone === 'info'
        ? (b.palette[1] ?? b.palette[0])
        : BADGE_TONE_COLORS[tone];

  // Vibe used by each `RoughText` so the badge's font/size/stroke override any
  // ambient vibe context and stay deterministic across SSR.
  const textVibe: VibeConfig = { fontFamily: font, fontSize, stroke: ink };

  // Pill outline as a sketchy rounded-rectangle path. `RoughRectangle` doesn't
  // expose `rx`/`ry`, so we feed a rounded-rect `d` to `RoughPath` instead of
  // widening the primitive API.
  const outlineD = roundedRectPath(0.5, 0.5, width - 1, HEIGHT - 1, 6);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className={className}
    >
      {/* Label half (ink wash @ 12%). Plain rect — flat fills don't want
          sketchy hachure, and `RoughRectangle` has no `fillStyle`/`opacity`
          surface to tune anyway. Clipped to the pill so the corners stay round. */}
      <clipPath id={`gc-badge-clip-${width}`}>
        <path d={outlineD} />
      </clipPath>
      <g clipPath={`url(#gc-badge-clip-${width})`}>
        <rect x={0} y={0} width={dividerX} height={HEIGHT} fill={ink} fillOpacity={0.12} />
        <rect
          x={dividerX}
          y={0}
          width={width - dividerX}
          height={HEIGHT}
          fill={valueFill}
          fillOpacity={0.18}
        />
      </g>
      {/* Sketchy outline */}
      <RoughPath d={outlineD} stroke={ink} fill={null} seed={seed} vibe={vibe} />
      {/* Divider */}
      <line
        x1={dividerX}
        y1={3}
        x2={dividerX}
        y2={HEIGHT - 3}
        stroke={ink}
        strokeWidth={DIVIDER_W}
      />
      {/* Optional icon */}
      {icon ? renderIcon(icon, PAD_X, (HEIGHT - ICON_SIZE) / 2, ink, seed, vibe) : null}
      {/* Label text */}
      <RoughText
        x={PAD_X + iconW + labelW / 2}
        y={HEIGHT / 2}
        anchor="middle"
        baseline="middle"
        fill={ink}
        vibe={textVibe}
      >
        {label}
      </RoughText>
      {/* Value text */}
      <RoughText
        x={valueX + valueW / 2}
        y={HEIGHT / 2}
        anchor="middle"
        baseline="middle"
        fill={ink}
        vibe={textVibe}
      >
        {value}
      </RoughText>
      {/* Mention the value-fill color even when it would otherwise only appear
          as `fillOpacity`'d markup that the test regex still finds — the rect
          above already carries it, this is just belt-and-braces for clarity. */}
    </svg>
  );
}

function renderIcon(
  name: BadgeIcon,
  ox: number,
  oy: number,
  stroke: string,
  seed: number | undefined,
  vibe: VibeConfig | undefined,
) {
  const entry = BADGE_ICON_PATHS[name];
  const strokes = Array.isArray(entry) ? entry : [entry];
  return (
    <g transform={`translate(${ox}, ${oy})`}>
      {strokes.map((d, i) => (
        <RoughPath
          key={i}
          d={d}
          stroke={stroke}
          fill={null}
          seed={seed === undefined ? undefined : seed + i}
          vibe={vibe}
        />
      ))}
    </g>
  );
}
