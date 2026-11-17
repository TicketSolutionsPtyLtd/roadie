import {
  type Drawing,
  ease,
  letterSide,
  polygon
} from '../scripts/spot/draw/index.ts'

// Two 9.4 stems, with a V between them whose point stops short of the base.
export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        polygon([
          [0, 0],
          [12.33, 0],
          [18.6, 20.5],
          [24.87, 0],
          [37.2, 0],
          [37.2, 42.3],
          [27.8, 42.3],
          [27.8, 17.5],
          [22.52, 35.5],
          [14.68, 35.5],
          [9.4, 17.5],
          [9.4, 42.3],
          [0, 42.3]
        ]),
        0.9,
        0.3
      )
    }
  ],
  vector: [3.82, 3.67],
  side: letterSide
} satisfies Drawing
