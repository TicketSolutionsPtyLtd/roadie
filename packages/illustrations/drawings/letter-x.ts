import {
  type Drawing,
  ease,
  letterSide,
  polygon
} from '../scripts/spot/draw/index.ts'

// Two strokes 11.2 across, crossing at the middle.
export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        polygon([
          [0, 0],
          [11.2, 0],
          [18.5, 11.97],
          [25.8, 0],
          [37, 0],
          [24.1, 21.15],
          [37, 42.3],
          [25.8, 42.3],
          [18.5, 30.33],
          [11.2, 42.3],
          [0, 42.3],
          [12.9, 21.15]
        ]),
        0.9,
        0.3
      )
    }
  ],
  vector: [3.9, 3.67],
  side: letterSide
} satisfies Drawing
