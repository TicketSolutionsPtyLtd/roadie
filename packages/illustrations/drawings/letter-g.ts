import {
  type Drawing,
  ease,
  ellipse,
  letterSide,
  rect,
  subtract,
  union
} from '../scripts/spot/draw/index.ts'

// Letter C, its lower terminal raised and squared into a bar that reaches
// into the counter.
// Caps a little flatter than half circles, as Letter Q's are.
const bowl = union(
  ellipse(15.1, 13.6, 15.1, 13.6),
  ellipse(15.1, 28.7, 15.1, 13.6),
  rect(0, 13.6, 30.2, 15.1)
)

export default {
  parts: [
    {
      layer: 'Face',
      shape: ease(
        union(
          subtract(
            bowl,
            rect(10.45, 9, 9.3, 24.3, 4.65),
            rect(15.1, 15.6, 20, 5.8)
          ),
          rect(15.6, 21.4, 14.6, 7.8)
        ),
        0.9,
        0.3
      )
    }
  ],
  vector: [3.9, 3.67],
  side: letterSide
} satisfies Drawing
