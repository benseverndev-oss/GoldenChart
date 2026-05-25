import { describe, expect, it } from 'vitest';
import { vibeTools } from './vibeTools';

const byName = (name: string) => vibeTools.find((t) => t.name === name)!;

describe('vibe tools', () => {
  it('list_vibe_presets returns all built-in presets with resolved knobs', async () => {
    const result = await byName('list_vibe_presets').handler({});
    const payload = result.structuredContent as {
      presets: { name: string; resolved: { roughness: number } }[];
    };
    expect(payload.presets.map((p) => p.name)).toEqual(
      expect.arrayContaining(['messy_sketch', 'clean_blueprint', 'chaotic_notebook']),
    );
    expect(typeof payload.presets[0].resolved.roughness).toBe('number');
  });

  it('resolve_vibe applies overrides and maps to Rough.js options', async () => {
    const result = await byName('resolve_vibe').handler({
      vibe: { preset: 'clean_blueprint', roughness: 9, fill: null },
    });
    const payload = result.structuredContent as {
      resolved: { roughness: number; fill: string | null; preset: string };
      roughOptions: { roughness: number; fill?: string };
    };
    expect(payload.resolved.roughness).toBe(9);
    expect(payload.resolved.preset).toBe('clean_blueprint');
    expect(payload.resolved.fill).toBeNull();
    // fill:null means "no fill" — it must not appear in the Rough.js options
    expect('fill' in payload.roughOptions).toBe(false);
  });

  it('preview_vibe renders a standalone SVG sample', async () => {
    const result = await byName('preview_vibe').handler({ vibe: 'chaotic_notebook' });
    const svg = result.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).toContain('GoldenChart');
  });
});
