import { DEFAULT_PALETTE } from '../core/palette';
import type {
  Brand,
  BrandConfig,
  BrandLogo,
  BrandVibeOverrides,
  ResolvedBrand,
  ResolvedBrandLogo,
} from '../types/brand';

const DEFAULT_LOGO_POSITION = 'bottom-right' as const;
const DEFAULT_LOGO_WIDTH = 64;
const DEFAULT_LOGO_MARGIN = 12;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function resolveLogo(logo: BrandLogo): ResolvedBrandLogo {
  const width = logo.width ?? DEFAULT_LOGO_WIDTH;
  return {
    src: logo.src,
    position: logo.position ?? DEFAULT_LOGO_POSITION,
    width,
    // A square box by default; the image scales to fit without distortion.
    height: logo.height ?? width,
    opacity: logo.opacity === undefined ? 1 : clamp01(logo.opacity),
    margin: logo.margin ?? DEFAULT_LOGO_MARGIN,
  };
}

/**
 * Translate a brand's identity fields into the vibe knobs they map to. Only
 * fields the brand actually set appear, so they never clobber a preset value.
 */
export function brandVibeOverrides(brand: Brand): BrandVibeOverrides {
  const overrides: BrandVibeOverrides = {};
  if (brand.ink !== undefined) overrides.stroke = brand.ink;
  if (brand.primary !== undefined) overrides.fill = brand.primary;
  if (brand.page !== undefined) overrides.background = brand.page;
  if (brand.font !== undefined) overrides.fontFamily = brand.font;
  return overrides;
}

/**
 * Collapse a `BrandConfig` into the pieces the renderer consumes: the
 * categorical palette, an optional resolved logo, and the vibe overrides the
 * brand contributes. The single boundary between loose brand config and the
 * strict internal shape — mirrors `resolveVibe`.
 */
export function resolveBrand(brand?: BrandConfig): ResolvedBrand {
  if (brand === undefined) {
    return { palette: DEFAULT_PALETTE, vibeOverrides: {} };
  }
  return {
    palette: brand.palette && brand.palette.length > 0 ? brand.palette : DEFAULT_PALETTE,
    logo: brand.logo ? resolveLogo(brand.logo) : undefined,
    vibeOverrides: brandVibeOverrides(brand),
  };
}
