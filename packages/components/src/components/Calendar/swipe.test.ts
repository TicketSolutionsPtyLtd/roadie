import { describe, expect, it } from 'vitest'

import { swipeTurns } from './swipe'

const moves = (...points: [along: number, time: number][]) =>
  points.map(([along, time]) => ({ along, time }))

describe('swipeTurns', () => {
  it.each([
    [
      'a slow drag past a quarter of a narrow grid',
      -90,
      300,
      moves([-10, 0], [-90, 800]),
      800,
      true
    ],
    [
      'a slow drag past 80px on a wide grid',
      -81,
      800,
      moves([-10, 0], [-81, 900]),
      900,
      true
    ],
    ['a slow short drag', -40, 300, moves([-10, 0], [-40, 900]), 900, false],
    ['a quick short flick', -40, 300, moves([-10, 0], [-40, 50]), 60, true],
    [
      'a flick coalesced into one move after the touch-down',
      -40,
      300,
      moves([0, 0], [-40, 16]),
      20,
      true
    ],
    [
      'a flick too short to count',
      -20,
      300,
      moves([0, 0], [-20, 10]),
      15,
      false
    ],
    [
      'a quick drag held before lifting',
      -40,
      300,
      moves([-10, 0], [-40, 50]),
      1500,
      false
    ],
    [
      'a flick back the other way',
      -40,
      300,
      moves([-60, 0], [-40, 20]),
      25,
      false
    ]
  ])('%s', (_, along, size, samples, releasedAt, expected) => {
    expect(swipeTurns({ along, size, samples, releasedAt })).toBe(expected)
  })
})
