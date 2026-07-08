/**
 * Server-only entry. Kept separate from the main entry so `react-dom/server`
 * never ends up in the browser bundle. Import the components/types from
 * `goldenchart`, and this headless renderer from `goldenchart/server`.
 */
export { renderToSVGString } from './render/renderToString';
// ChoroplethMap is server-only: it hard-imports the US state geometry, which must
// stay off the `.` browser entry (bundle guard). Exported here so the MCP renders it.
export { ChoroplethMap } from './components/ChoroplethMap';
export type { ChoroplethDatum, ChoroplethMapProps } from './components/ChoroplethMap';
