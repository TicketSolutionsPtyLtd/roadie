import {
  type Drawing,
  ease,
  letterSide,
  polygon
} from '../scripts/spot/draw/index.ts'

// An 11.4 stem; the arm runs up from it and the leg down from the arm, each
// about 10 across.
export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        polygon([
          [0, 0],
          [11.4, 0],
          [11.4, 15.5],
          [22.5, 0],
          [34.6, 0],
          [21.61, 18.14],
          [35.6, 42.3],
          [23.2, 42.3],
          [14.75, 27.71],
          [11.4, 32.4],
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
