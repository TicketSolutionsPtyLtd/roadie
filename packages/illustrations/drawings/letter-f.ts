import {
  type Drawing,
  ease,
  letterSide,
  polygon
} from '../scripts/spot/draw/index.ts'

// Matches Letter E: an 11.4 stem, arms 9.7 deep, the middle arm shorter.
export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        polygon([
          [0, 0],
          [30, 0],
          [30, 9.7],
          [11.4, 9.7],
          [11.4, 16],
          [24.6, 16],
          [24.6, 25.7],
          [11.4, 25.7],
          [11.4, 42.3],
          [0, 42.3]
        ]),
        0.9,
        0.3
      )
    }
  ],
  vector: [3.9, 3.67],
  side: letterSide
} satisfies Drawing
