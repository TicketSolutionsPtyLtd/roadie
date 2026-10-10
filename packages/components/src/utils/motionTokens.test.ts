import { describe, expect, it } from 'vitest'

import { durationToken, easingToken } from './motionTokens'

describe('motion tokens without core’s CSS', () => {
  it('falls back to core’s values', () => {
    expect(durationToken(document.body, 'moderate')).toBe(200)
    expect(durationToken(document.body, 'slow')).toBe(300)
    expect(easingToken(document.body, 'enter')).toBe(
      'cubic-bezier(0, 0, 0.2, 1)'
    )
  })
})
