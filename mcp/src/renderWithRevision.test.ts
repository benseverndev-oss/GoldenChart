import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { visualizeTools } from './visualizeTool';

const suggest = visualizeTools.find((t) => t.name === 'suggest_improvements')!;
const revise = visualizeTools.find((t) => t.name === 'render_with_revision')!;

describe('render_with_revision tool', () => {
  it('is registered', () => {
    expect(revise).toBeDefined();
  });

  it('shrinks the critique set when the suggested fix is applied', async () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      team: `Team ${i}`,
      points: 100 - i,
    }));

    const initial = await suggest.handler({ data, width: 480, height: 300 });
    const initialCritiques = (
      initial.structuredContent as { critiques: { rule: string; fix?: Record<string, unknown> }[] }
    ).critiques;
    const crowded = initialCritiques.find((c) => c.rule === 'too-many-categories');
    expect(crowded, 'expected a too-many-categories critique on a 20-bar dataset').toBeTruthy();
    expect(crowded?.fix).toBeTruthy();

    const args = {
      data,
      width: 480,
      height: 300,
      revisions: crowded!.fix as Record<string, unknown>,
    };
    expect(z.object(revise.config.inputSchema).safeParse(args).success).toBe(true);

    const result = await revise.handler(args);
    const structured = result.structuredContent as {
      svg: string;
      applied: Record<string, unknown>;
      critiques: { rule: string }[];
    };

    expect(structured.svg.startsWith('<svg')).toBe(true);
    expect(structured.applied).toEqual(crowded!.fix);
    expect(structured.critiques.map((c) => c.rule)).not.toContain('too-many-categories');
  });

  it('forces a chart type via revisions.chartType', async () => {
    // A small categorical dataset would normally pick a bar; force it to pie.
    const data = [
      { region: 'NA', revenue: 25 },
      { region: 'EU', revenue: 50 },
      { region: 'APAC', revenue: 75 },
    ];
    const result = await revise.handler({
      data,
      width: 480,
      height: 300,
      revisions: { chartType: 'pie' },
    });
    const structured = result.structuredContent as {
      chosen: { chartType: string };
      svg: string;
    };
    expect(structured.chosen.chartType).toBe('pie');
    expect(structured.svg.startsWith('<svg')).toBe(true);
  });

  it('is a no-op when revisions is empty', async () => {
    const data = [
      { region: 'NA', revenue: 25 },
      { region: 'EU', revenue: 50 },
    ];
    const result = await revise.handler({ data, width: 480, height: 300, revisions: {} });
    const structured = result.structuredContent as {
      applied: Record<string, unknown>;
      critiques: unknown[];
    };
    expect(structured.applied).toEqual({});
    expect(structured.critiques).toEqual([]);
  });
});
