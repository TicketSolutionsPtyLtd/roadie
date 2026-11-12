import {
  type Drawing,
  ease,
  letterSide,
  rect,
  subtract
} from '../scripts/spot/draw/index.ts'

// An 11.4 stem on the right that hooks round to a flat terminal on the left.
export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        subtract(
          rect(0, 0, 29, 42.3, [0, 0, 14.5, 14.5]),
          rect(10.2, -1, 7.4, 33.7, [0, 0, 3.7, 3.7]),
          rect(-1, -1, 18.6, 28.5)
        ),
        0.9,
        0.3
      )
    }
  ],
  vector: [3.9, 3.67],
  side: letterSide
} satisfies Drawing
