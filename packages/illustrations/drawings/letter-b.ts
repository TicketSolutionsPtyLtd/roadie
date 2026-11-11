import {
  type Drawing,
  rect,
  subtract,
  union
} from '../scripts/spot/draw/index.ts'

// Proportions from the set's drawn letters (P, R, D): a 42.3 tall front, an
// 11.4 wide stem, bowls as deep as half their height, corners eased by 0.9.
const EASE = 0.9

const upperBowl = rect(0, 0, 29.4, 21.2, [EASE, 10.6, 10.6, 0])
const lowerBowl = rect(0, 20.4, 32.4, 21.9, [0, 10.95, 10.95, EASE])
const upperCounter = rect(11.4, 8, 7.4, 8, [0.3, 4, 4, 0.3])
const lowerCounter = rect(11.4, 24.4, 10.2, 9.4, [0.3, 4.7, 4.7, 0.3])

export default {
  parts: [
    {
      layer: 'Face',
      shape: subtract(union(upperBowl, lowerBowl), upperCounter, lowerCounter)
    }
  ],
  vector: [3.9, 3.67]
} satisfies Drawing
