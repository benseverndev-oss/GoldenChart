import { describe, expect, it } from 'vitest';
import { VIBE_PRESETS } from 'goldenchart';
import { VibeConfigSchema } from './schemas';
import { vibeTools } from './vibeTools';
import { primitiveTools } from './primitiveTools';

/**
 * These tests guard against the MCP agent surface drifting behind the library:
 * capabilities the library supports but the tool schemas hide. See
 * docs/superpowers/specs/2026-05-26-mcp-agent-surface-drift-design.md.
 */
describe('vibe preset coverage', () => {
  it('VibeConfigSchema accepts every built-in preset name', () => {
    for (const name of Object.keys(VIBE_PRESETS)) {
      expect(VibeConfigSchema.safeParse(name).success, name).toBe(true);
    }
  });

  it('the preset enum set equals VIBE_PRESETS keys (no drift either way)', () => {
    // VibeConfigSchema is a union; the bare-preset enum is its first option.
    const presetEnum = VibeConfigSchema.options[0] as { options: readonly string[] };
    const enumNames = [...presetEnum.options].sort();
    const libNames = Object.keys(VIBE_PRESETS).sort();
    expect(enumNames).toEqual(libNames);
  });
});

describe('animate knob', () => {
  it('VibeConfigSchema keeps the animate override instead of stripping it', () => {
    const parsed = VibeConfigSchema.parse({ preset: 'pencil', animate: { drawOn: true, durationMs: 800 } });
    expect(parsed).toMatchObject({ animate: { drawOn: true, durationMs: 800 } });
  });

  it('resolve_vibe round-trips animate through to the resolved vibe', async () => {
    const resolveVibeTool = vibeTools.find((t) => t.name === 'resolve_vibe')!;
    const result = await resolveVibeTool.handler({
      vibe: VibeConfigSchema.parse({ preset: 'pencil', animate: { drawOn: true } }),
    });
    const { resolved } = result.structuredContent as { resolved: { animate?: { drawOn?: boolean } } };
    expect(resolved.animate).toEqual({ drawOn: true });
  });
});

describe('render_rough_text text knobs', () => {
  const renderText = primitiveTools.find((t) => t.name === 'render_rough_text')!;

  it('applies an explicit fill colour to the text', async () => {
    const result = await renderText.handler({
      viewport: { width: 200, height: 80 },
      x: 100,
      y: 40,
      text: 'Hello',
      fill: '#ff00ee',
    });
    expect(result.content[0].text).toContain('#ff00ee');
  });

  it('wraps text into multiple lines at maxWidth', async () => {
    const result = await renderText.handler({
      viewport: { width: 200, height: 120 },
      x: 100,
      y: 40,
      text: 'the quick brown fox jumps over the lazy dog',
      maxWidth: 70,
    });
    const tspans = result.content[0].text.match(/<tspan/g) ?? [];
    expect(tspans.length).toBeGreaterThan(1);
  });
});
