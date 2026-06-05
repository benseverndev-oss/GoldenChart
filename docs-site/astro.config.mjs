import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Goldchart docs site. Built independently of the library; deployed under
// `/docs/` of the GitHub Pages site alongside the existing playground.
export default defineConfig({
  site: 'https://benseverndev-oss.github.io',
  base: '/GoldenChart/docs',
  integrations: [
    starlight({
      title: 'GoldenChart',
      description:
        'Hand-drawn, sketchy React charts and flowcharts. D3 does the math, Rough.js does the drawing, and a Vibe engine dials in the aesthetic.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/benseverndev-oss/GoldenChart',
        },
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Introduction', link: '/' },
            { label: 'Quick start', link: '/start/quick-start/' },
            { label: 'Brand vs. vibe', link: '/start/brand-vs-vibe/' },
          ],
        },
        {
          label: 'Charts',
          items: [
            { label: 'BarChart', link: '/charts/bar-chart/' },
            { label: 'LineChart', link: '/charts/line-chart/' },
            { label: 'AreaChart', link: '/charts/area-chart/' },
            { label: 'ScatterPlot', link: '/charts/scatter-plot/' },
            { label: 'PieChart', link: '/charts/pie-chart/' },
            { label: 'SankeyChart', link: '/charts/sankey-chart/' },
            { label: 'TreemapChart', link: '/charts/treemap-chart/' },
            { label: 'HeatmapChart', link: '/charts/heatmap-chart/' },
            { label: 'RadarChart', link: '/charts/radar-chart/' },
          ],
        },
        {
          label: 'Diagrams',
          items: [
            { label: 'Flowchart', link: '/diagrams/flowchart/' },
            { label: 'OrgChart', link: '/diagrams/org-chart/' },
            { label: 'MindMap', link: '/diagrams/mind-map/' },
            { label: 'ArchitectureDiagram', link: '/diagrams/architecture-diagram/' },
            { label: 'SequenceDiagram', link: '/diagrams/sequence-diagram/' },
            { label: 'ERDiagram', link: '/diagrams/er-diagram/' },
            { label: 'Timeline', link: '/diagrams/timeline/' },
            { label: 'Diagram (low-level)', link: '/diagrams/diagram/' },
          ],
        },
        {
          label: 'Auto-charting',
          items: [{ label: 'AutoChart', link: '/auto/auto-chart/' }],
        },
        {
          label: 'Recipes',
          items: [
            { label: 'Responsive sizing', link: '/recipes/responsive/' },
            { label: 'Dark mode', link: '/recipes/dark-mode/' },
            { label: 'Export to PNG/SVG', link: '/recipes/export/' },
          ],
        },
        {
          label: 'MCP server',
          items: [{ label: 'Overview', link: '/mcp/overview/' }],
        },
        {
          label: 'Gallery',
          items: [
            { label: 'Vibes', link: '/gallery/vibes/' },
            { label: 'Brands', link: '/gallery/brands/' },
          ],
        },
      ],
    }),
  ],
});
