// Extract prop tables from the library's TypeScript types at docs-build time so
// the per-chart reference pages never drift from the real component props.
//
// Runs react-docgen-typescript over ../src/components, keeps props declared in
// our own source (BaseChartProps and friends included; React DOM attributes
// dropped), and writes a JSON map consumed by the <PropTable> component.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { withCustomConfig } from 'react-docgen-typescript';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const tsconfig = resolve(repoRoot, 'tsconfig.json');

// The public chart/diagram components that get a reference page. File names
// match the component names one-to-one under src/components.
const COMPONENTS = [
  'BarChart',
  'LineChart',
  'AreaChart',
  'ScatterPlot',
  'PieChart',
  'SankeyChart',
  'TreemapChart',
  'HeatmapChart',
  'RadarChart',
  'Flowchart',
  'MindMap',
  'OrgChart',
  'ArchitectureDiagram',
  'Diagram',
  'SequenceDiagram',
  'ERDiagram',
  'Timeline',
  'AutoChart',
];

const parser = withCustomConfig(tsconfig, {
  savePropValueAsString: true,
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
  // Keep props declared in our own source (so inherited BaseChartProps shows
  // up), drop anything coming from node_modules (React's HTMLAttributes etc.).
  propFilter: (prop) => {
    if (prop.declarations && prop.declarations.length > 0) {
      const fromExternal = prop.declarations.some((d) => d.fileName.includes('node_modules'));
      if (fromExternal) return false;
    }
    return !prop.parent || !prop.parent.fileName.includes('node_modules');
  },
});

const out = {};
for (const name of COMPONENTS) {
  const file = resolve(repoRoot, 'src', 'components', `${name}.tsx`);
  const docs = parser.parse(file);
  const doc = docs.find((d) => d.displayName === name) ?? docs[0];
  if (!doc) {
    console.warn(`gen-props: no component doc found for ${name}`);
    continue;
  }
  const props = Object.values(doc.props)
    .map((p) => ({
      name: p.name,
      type: p.type?.name ?? 'unknown',
      required: p.required,
      defaultValue: p.defaultValue?.value ?? null,
      description: (p.description ?? '').trim(),
    }))
    // Stable, readable order: required first, then alphabetical.
    .sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  out[name] = { description: (doc.description ?? '').trim(), props };
}

const outDir = resolve(here, '..', 'src', 'generated');
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, 'props.json');
writeFileSync(outFile, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `gen-props: wrote ${Object.keys(out).length} component prop tables -> ${resolve(outFile)}`,
);
