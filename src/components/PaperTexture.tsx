import { useMemo } from 'react';
import { isDarkColor, paperSpeckles, type SpeckleTier } from '../core/texture';

export interface PaperTextureProps {
  width: number;
  height: number;
  /** Seed for the deterministic speckle (use the resolved vibe seed). */
  seed: number;
  /** Speckle intensity. Defaults to the original `medium` look. */
  tier?: SpeckleTier;
  /** Surface colour; specks are tinted light on dark grounds and vice versa. */
  background?: string;
}

/**
 * A faint, deterministic paper grain painted behind the data on matte vibes, so
 * the background reads as textured paper rather than a flat fill. Decorative —
 * hidden from assistive tech.
 */
export function PaperTexture({
  width,
  height,
  seed,
  tier = 'medium',
  background,
}: PaperTextureProps) {
  const tint = isDarkColor(background) ? '#ffffff' : '#3c3223';
  const specks = useMemo(
    () => paperSpeckles(width, height, seed, tier),
    [width, height, seed, tier],
  );
  return (
    <g aria-hidden="true">
      {specks.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={tint} fillOpacity={s.opacity} />
      ))}
    </g>
  );
}
