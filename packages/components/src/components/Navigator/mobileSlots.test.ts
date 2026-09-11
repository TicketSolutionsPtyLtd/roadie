import { describe, expect, it } from 'vitest'

import {
  type NavigatorSlotMeta,
  type NavigatorVisibilityPriority,
  deriveMobileSlots,
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

const meta = (
  value: string,
  priority: NavigatorVisibilityPriority = 'automatic',
  placement: 'automatic' | 'pinned' = 'automatic'
): NavigatorSlotMeta => ({
  value,
  label: value,
  topValue: value,
  descendants: [],
  placement,
  priority
})
const many = (n: number) =>
  Array.from({ length: n }, (_, i) => meta(`/${String.fromCharCode(97 + i)}`))

describe('deriveMobileSlots', () => {
  it('renders five or fewer as tabs with no More', () => {
    const slots = deriveMobileSlots(many(5), [])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c', '/d', '/e'])
    expect(slots.overflow).toEqual([])
    expect(slots.pinned).toBeUndefined()
  })

  it('keeps the top four by rank and folds the rest past five', () => {
    const slots = deriveMobileSlots(many(6), [])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c', '/d'])
    expect(values(slots.overflow)).toEqual(['/e', '/f'])
  })

  it('keeps a high-priority item in source position', () => {
    const items = many(6)
    items[5] = meta('/f', 'high')
    const slots = deriveMobileSlots(items, [])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c', '/f'])
    expect(values(slots.overflow)).toEqual(['/d', '/e'])
  })

  it('counts the pinned circle as one of the five', () => {
    const account = meta('account', 'automatic', 'pinned')
    const slots = deriveMobileSlots(many(4), [account])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c', '/d'])
    expect(slots.pinned).toBe(account)
    expect(slots.overflow).toEqual([])
  })

  it('keeps the top three and folds the lowest two beside a circle', () => {
    const items = many(5)
    items[0] = meta('/a', 'low')
    items[4] = meta('/e', 'high')
    const slots = deriveMobileSlots(items, [
      meta('account', 'automatic', 'pinned')
    ])
    expect(values(slots.tabs)).toEqual(['/b', '/c', '/e'])
    expect(values(slots.overflow)).toEqual(['/a', '/d'])
  })

  it('folds further pinned items into More', () => {
    const one = meta('one', 'automatic', 'pinned')
    const two = meta('two', 'automatic', 'pinned')
    const slots = deriveMobileSlots(many(3), [one, two])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c'])
    expect(slots.pinned).toBe(one)
    expect(values(slots.overflow)).toEqual(['two'])
  })

  it('makes room for More when an extra pinned item forces it', () => {
    const slots = deriveMobileSlots(many(5), [
      meta('one', 'automatic', 'pinned'),
      meta('two', 'automatic', 'pinned')
    ])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c'])
    expect(values(slots.overflow)).toEqual(['/d', '/e', 'two'])
  })
})
