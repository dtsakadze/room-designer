/** How the app's line icons are drawn: 16 px, round 1.8 px strokes in the text colour, hidden from screen readers. */
export const ICON_PROPS = {
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const
