import {
  type Drawing,
  ease,
  letterSide,
  rect,
  subtract
} from '../scripts/spot/draw/index.ts'

// Letter H's stems, joined by a round base 9.7 deep.
export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        subtract(
          rect(0, 0, 32.4, 42.3, [0, 0, 16.2, 16.2]),
          rect(11.4, -1, 9.6, 33.6, [0, 0, 4.8, 4.8])
        ),
        0.9,
        0.3
      )
    }
  ],
  vector: [3.9, 3.67],
  side: letterSide
} satisfies Drawing
