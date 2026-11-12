import {
  type Drawing,
  ease,
  letterSide,
  polygon
} from '../scripts/spot/draw/index.ts'

// Four strokes 9.6 across, all at one slant, so the middle peak reaches the top.
export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        polygon([
          [0, 0],
          [9.6, 0],
          [12.9, 17.23],
          [16.2, 0],
          [25.8, 0],
          [29.1, 17.23],
          [32.4, 0],
          [42, 0],
          [33.9, 42.3],
          [24.3, 42.3],
          [21, 25.07],
          [17.7, 42.3],
          [8.1, 42.3]
        ]),
        0.9,
        0.3
      )
    }
  ],
  vector: [3.9, 3.67],
  side: letterSide
} satisfies Drawing
