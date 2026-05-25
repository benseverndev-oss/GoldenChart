import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { tools } from './tools';

describe('render_bar_chart tool', () => {
  const tool = tools.find((t) => t.name === 'render_bar_chart')!;

  it('is registered', () => {
    expect(tool).toBeDefined();
    expect(tool.config.outputSchema).toBeDefined();
  });

  it('renders a standalone SVG with sketched paths', async () => {
    const result = await tool.handler({
      data: [
        { label: 'a', value: 3 },
        { label: 'b', value: 7 },
      ],
      width: 300,
      height: 200,
      vibe: 'messy_sketch',
    });
    const svg = result.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<div');
  });

  it('accepts inputs that match its declared schema', () => {
    const schema = z.object(tool.config.inputSchema);
    const parsed = schema.safeParse({ data: [{ label: 'a', value: 1 }], width: 100, height: 80 });
    expect(parsed.success).toBe(true);
  });

  it('rejects malformed input', () => {
    const schema = z.object(tool.config.inputSchema);
    expect(schema.safeParse({ data: [], width: 'nope' }).success).toBe(false);
  });
});
