import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { visualizeTools } from './visualizeTool';

const tool = visualizeTools.find((t) => t.name === 'visualize_data')!;

const sales = [
  { region: 'NA', revenue: 25 },
  { region: 'EU', revenue: 50 },
  { region: 'APAC', revenue: 75 },
];

describe('visualize_data — natural-language query', () => {
  it('accepts an optional query in its input schema', () => {
    const args = { data: sales, query: 'revenue by region as a pie', width: 480, height: 300 };
    expect(z.object(tool.config.inputSchema).safeParse(args).success).toBe(true);
  });

  it('honors a chart-type override and reports the interpretation', async () => {
    const result = await tool.handler({ data: sales, query: 'revenue by region as a pie', width: 480, height: 300 });
    const s = result.structuredContent as {
      svg: string;
      chosen: { chartType: string };
      interpretation?: { chartType?: string; confidence: number };
    };
    expect(s.svg.startsWith('<svg')).toBe(true);
    expect(s.chosen.chartType).toBe('pie');
    expect(s.interpretation?.chartType).toBe('pie');
  });

  it('omits interpretation when no query is given (back-compat)', async () => {
    const result = await tool.handler({ data: sales, width: 480, height: 300 });
    const s = result.structuredContent as { interpretation?: unknown; chosen: { chartType: string } };
    expect(s.interpretation).toBeUndefined();
    expect(s.chosen.chartType).toBeTruthy();
  });

  it('threads a vibe parsed from the query into the SVG', async () => {
    const result = await tool.handler({ data: sales, query: 'revenue by region in pencil', width: 480, height: 300 });
    const s = result.structuredContent as { interpretation?: { vibe?: unknown } };
    expect(s.interpretation?.vibe).toBe('pencil');
  });
});
