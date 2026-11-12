import {
  type Drawing,
  ease,
  letterSide,
  polygon
} from '../scripts/spot/draw/index.ts'

// Bars 9.7 deep, as Letter E's, joined by a diagonal about 10.8 across.
export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        polygon([
          [0.6, 0],
          [30.4, 0],
          [30.4, 8.6],
          [14, 32.6],
          [31, 32.6],
          [31, 42.3],
          [0, 42.3],
          [0, 33.6],
          [16.6, 9.7],
          [0.6, 9.7]
        ]),
        0.9,
        0.3
      )
    }
  ],
  vector: [3.9, 3.67],
  side: letterSide
} satisfies Drawing
