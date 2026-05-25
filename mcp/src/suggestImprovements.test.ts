import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { visualizeTools } from './visualizeTool';

const tool = visualizeTools.find((t) => t.name === 'suggest_improvements')!;

describe('suggest_improvements tool', () => {
  it('is registered', () => {
    expect(tool).toBeDefined();
  });

  it('renders the chart and returns actionable critiques for a crowded bar chart', async () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ team: `Team number ${i}`, points: 50 + i }));
    const args = { data, width: 480, height: 300, vibe: 'clean_blueprint' };

    expect(z.object(tool.config.inputSchema).safeParse(args).success).toBe(true);

    const result = await tool.handler(args);
    const structured = result.structuredContent as {
      svg: string;
      chosen: { chartType: string };
      critiques: { rule: string; severity: string }[];
    };
    expect(structured.svg.startsWith('<svg')).toBe(true);
    expect(structured.chosen.chartType).toBe('bar');
    expect(structured.critiques.map((c) => c.rule)).toContain('too-many-categories');
  });

  it('returns an empty critique list for a clean dataset', async () => {
    const data = [
      { region: 'NA', revenue: 25 },
      { region: 'EU', revenue: 50 },
      { region: 'APAC', revenue: 75 },
      { region: 'LATAM', revenue: 100 },
    ];
    const result = await tool.handler({ data, width: 640, height: 360 });
    const structured = result.structuredContent as { critiques: unknown[] };
    expect(structured.critiques).toEqual([]);
  });
});
