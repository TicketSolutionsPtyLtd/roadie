import { describe, expect, it } from 'vitest'

import { decideSnapTarget } from './snap'

const base = {
  offset: 0,
  currentState: 'closed' as const,
  closedY: 300,
  openY: 0
}

describe('decideSnapTarget', () => {
  it('upward flick opens', () => {
    expect(decideSnapTarget({ ...base, velocity: -600 })).toBe('open')
  })
  it('downward flick closes', () => {
    expect(
      decideSnapTarget({ ...base, velocity: 600, currentState: 'open' })
    ).toBe('closed')
  })
  it('exactly -500 falls through to position', () => {
    // startY=closedY=300, offset 0 → currentY 300 > midpoint 150 → closed
    expect(decideSnapTarget({ ...base, velocity: -500 })).toBe('closed')
  })
  it('exact midpoint keeps state', () => {
    expect(decideSnapTarget({ ...base, velocity: 0, offset: -150 })).toBe(
      'closed'
    )
  })
})
