// `goldenchart/usStates` — opt-in pre-projected US state geometry. Kept off the
// main `.` entry so browser consumers only pay for it when they render a map.
export { US_STATES_GEOMETRY, US_STATES_VIEWBOX } from './assets/usStates';
import { US_STATES_GEOMETRY } from './assets/usStates';

/** The pre-projected SVG path `d` for a 2-letter USPS state code, or undefined. */
export function stateGeometry(code: string): string | undefined {
  return US_STATES_GEOMETRY[code.toUpperCase()];
}
