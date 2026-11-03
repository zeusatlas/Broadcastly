// The app's meandering edge, as cubic bezier points [x fraction, depth]. Depth 0 is the highest
// point (right), 1 the lowest (left). Shared so onboarding and auth headers curve the same way.
const WAVE_EDGE: readonly (readonly [number, number])[] = [
  [0, 1],
  [0.1, 0.833],
  [0.18, 0.963],
  [0.32, 0.87],
  [0.48, 0.759],
  [0.55, 0.333],
  [0.7, 0.204],
  [0.82, 0.093],
  [0.9, 0],
  [1, 0],
];

// Left-to-right edge across `width`; `toY` maps a depth (0–1) to a y coordinate.
export function waveEdge(width: number, toY: (depth: number) => number) {
  const curve = WAVE_EDGE.slice(1)
    .map(([x, depth]) => `${width * x} ${toY(depth)}`)
    .reduce((path, point, i) => path + (i % 3 === 0 ? ' C' : ' ') + point, '');

  return { startY: toY(WAVE_EDGE[0][1]), curve };
}

// A filled region from the top of the canvas down to a wave edge.
export function waveRegionFromTop(width: number, toY: (depth: number) => number): string {
  const { startY, curve } = waveEdge(width, toY);

  return `M0 0 V${startY}${curve} V0 Z`;
}
