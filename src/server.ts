/**
 * Server-only entry. Kept separate from the main entry so `react-dom/server`
 * never ends up in the browser bundle. Import the components/types from
 * `goldenchart`, and this headless renderer from `goldenchart/server`.
 */
export { renderToSVGString } from './render/renderToString';
