/**
 * Wood grain as two tiling patterns, lines running across (`grain-horizontal`)
 * or up (`grain-vertical`), filled over parts whose board has a grain. Sized
 * with `unit`, like the strokes, so the grain stays as fine on screen at any zoom.
 */
const LINES = [
  // Position within the tile and how dark, so the lines don't look ruled.
  [3, 0.3],
  [8, 0.16],
  [11, 0.32],
  [19, 0.2],
  [24, 0.3],
  [28, 0.14],
  [33, 0.26],
] as const

export function GrainPatterns({ unit }: { unit: number }) {
  const tile = 36 * unit
  const lines = LINES.map(([at, opacity]) => (
    <line
      key={at}
      x1={0}
      y1={at * unit}
      x2={tile}
      y2={at * unit}
      stroke="#6b4a1f"
      strokeOpacity={opacity}
      strokeWidth={0.9 * unit}
    />
  ))
  return (
    <defs>
      <pattern id="grain-horizontal" patternUnits="userSpaceOnUse" width={tile} height={tile}>
        {lines}
      </pattern>
      <pattern
        id="grain-vertical"
        patternUnits="userSpaceOnUse"
        width={tile}
        height={tile}
        patternTransform="rotate(90)"
      >
        {lines}
      </pattern>
    </defs>
  )
}
