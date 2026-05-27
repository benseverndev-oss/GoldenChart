import { useState } from 'react';
import type { ReactNode } from 'react';
import { BarChart, LineChart } from 'goldenchart';
import type { ChartDatum, Series, VibeConfig, BrandConfig } from 'goldenchart';
import { InteractiveChart, LinkedCharts } from 'goldenchart/interactive';

const QUARTERS: ChartDatum[] = [
  { label: 'Q1', value: 12 },
  { label: 'Q2', value: 19 },
  { label: 'Q3', value: 7 },
  { label: 'Q4', value: 24 },
];

const COST: ChartDatum[] = [
  { label: 'Q1', value: 8 },
  { label: 'Q2', value: 11 },
  { label: 'Q3', value: 5 },
  { label: 'Q4', value: 15 },
];

const TREND: Series[] = [
  { id: 'revenue', points: Array.from({ length: 24 }, (_, i) => ({ x: i, y: 10 + 8 * Math.sin(i / 3) + i * 0.4 })) },
];

function shuffle(): ChartDatum[] {
  return QUARTERS.map((d) => ({ ...d, value: Math.round(4 + Math.random() * 22) }));
}

function Card({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <p className="mb-3 text-xs text-gray-500">{hint}</p>
      {children}
    </div>
  );
}

function Log({ text }: { text: string }) {
  return <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs text-slate-700">{text}</pre>;
}

/** Featured demo of the opt-in `goldenchart/interactive` layer: hover/select,
 *  zoom/pan/brush, animated transitions, and linked crossfilter. */
export function InteractivityShowcase({ vibe, brand }: { vibe: VibeConfig; brand?: BrandConfig }) {
  const [selectLog, setSelectLog] = useState('hover or click a bar…');
  const [navLog, setNavLog] = useState('scroll to zoom · drag to brush a range');
  const [bars, setBars] = useState<ChartDatum[]>(QUARTERS);
  const [linkLog, setLinkLog] = useState('brush either chart to filter both');

  return (
    <section className="mx-auto mb-8 max-w-5xl rounded-lg border border-amber-300 bg-amber-50/40 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight">Interactivity</h2>
        <p className="mt-1 text-sm text-gray-600">
          Opt-in via <code className="rounded bg-white px-1">goldenchart/interactive</code>. The static charts stay
          untouched; wrap one in <code className="rounded bg-white px-1">&lt;InteractiveChart&gt;</code> to light it up.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Hover · tooltip · select" hint="Hover for a sketched tooltip; click bars to select.">
          <InteractiveChart
            vibe={vibe}
            tooltip
            highlight
            selectable
            multiSelect
            onHover={(m) => m && setSelectLog(`hover: ${m.label} = ${String(m.value)}`)}
            onSelect={(m, keys) => setSelectLog(`select: ${m.label} → ${keys.length} selected`)}
          >
            <BarChart width={440} height={260} vibe={vibe} brand={brand} data={QUARTERS} title="Weekly visits" />
          </InteractiveChart>
          <Log text={selectLog} />
        </Card>

        <Card title="Zoom · pan · brush" hint="Wheel to zoom, drag to brush a range (continuous x-axis).">
          <InteractiveChart
            vibe={vibe}
            zoom
            brush
            tooltip
            onBrush={(marks) => setNavLog(marks.length ? `brushed ${marks.length} points` : 'brush cleared')}
          >
            <LineChart width={440} height={260} vibe={vibe} brand={brand} series={TREND} curve="catmullRom" showPoints />
          </InteractiveChart>
          <Log text={navLog} />
        </Card>

        <Card title="Animated transitions" hint="Re-sketches between datasets; snaps under reduced-motion.">
          <InteractiveChart vibe={vibe} tooltip transition={{ durationMs: 600 }}>
            <BarChart width={440} height={260} vibe={vibe} brand={brand} data={bars} title="Live metric" />
          </InteractiveChart>
          <button
            type="button"
            className="mt-2 rounded border border-gray-400 bg-white px-3 py-1 text-sm hover:bg-gray-50"
            onClick={() => setBars(shuffle())}
          >
            Shuffle data
          </button>
        </Card>

        <Card title="Linked crossfilter" hint="Brush one chart; matching quarters emphasize in both.">
          <LinkedCharts>
            <div className="flex flex-col gap-3">
              <InteractiveChart
                vibe={vibe}
                linkGroup="rev"
                brush
                onBrush={(m) => setLinkLog(m.length ? `brushed ${m.length} quarters` : 'cleared')}
              >
                <BarChart width={440} height={150} vibe={vibe} brand={brand} data={QUARTERS} title="Revenue" />
              </InteractiveChart>
              <InteractiveChart vibe={vibe} linkGroup="cost" brush onBrush={(m) => setLinkLog(`brushed ${m.length}`)}>
                <BarChart width={440} height={150} vibe={vibe} brand={brand} data={COST} title="Cost" />
              </InteractiveChart>
            </div>
          </LinkedCharts>
          <Log text={linkLog} />
        </Card>
      </div>
    </section>
  );
}
