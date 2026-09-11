import { describe, expect, it } from 'vitest'

import {
  type NavigatorVisibilityPriority,
  keepTopRanked,
  rankSlots
} from './mobileSlots'

const slot = (
  value: string,
  priority: NavigatorVisibilityPriority = 'automatic'
) => ({
  value,
  priority
})
const values = (slots: { value: string }[]) => slots.map((s) => s.value)

describe('rankSlots', () => {
  it('orders high, then automatic, then low', () => {
    expect(
      values(rankSlots([slot('a', 'low'), slot('b'), slot('c', 'high')]))
    ).toEqual(['c', 'b', 'a'])
  })

  it('breaks ties by source order', () => {
    expect(values(rankSlots([slot('a'), slot('b'), slot('c')]))).toEqual([
      'a',
      'b',
      'c'
    ])
  })

  it('does not mutate its input', () => {
    const input = [slot('a', 'low'), slot('b', 'high')]
    rankSlots(input)
    expect(values(input)).toEqual(['a', 'b'])
  })
})

describe('keepTopRanked', () => {
  it('decides membership by rank but keeps source order', () => {
    const { kept, folded } = keepTopRanked(
      [slot('a', 'low'), slot('b'), slot('c'), slot('d', 'high')],
      2
    )
    expect(values(kept)).toEqual(['b', 'd'])
    expect(values(folded)).toEqual(['a', 'c'])
  })

  it('keeps everything when the count covers it', () => {
    const { kept, folded } = keepTopRanked([slot('a'), slot('b')], 5)
    expect(values(kept)).toEqual(['a', 'b'])
    expect(folded).toEqual([])
  })

  it('folds everything at zero', () => {
    expect(values(keepTopRanked([slot('a')], 0).folded)).toEqual(['a'])
  })
})
