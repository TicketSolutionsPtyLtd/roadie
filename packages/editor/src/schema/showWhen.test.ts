import { describe, expect, it } from 'vitest'

import { type ShowWhen, showWhenLabel } from './showWhen'

describe('showWhenLabel', () => {
  it.each<[ShowWhen, string]>([
    [
      { key: 'tickets_left', op: 'lessThan', value: 50 },
      'Only when Tickets left < 50'
    ],
    [
      { key: 'tickets_left', op: 'greaterThan', value: 0 },
      'Only when Tickets left > 0'
    ],
    [
      { key: 'tickets_left', op: 'equals', value: 'VIP' },
      'Only when Tickets left is VIP'
    ],
    [
      { key: 'tickets_left', op: 'notEquals', value: 'VIP' },
      'Only when Tickets left isn’t VIP'
    ],
    [{ key: 'tickets_left', op: 'exists' }, 'Only when Tickets left is set']
  ])('says %o as an author reads it', (rule, label) => {
    expect(showWhenLabel(rule, 'Tickets left')).toBe(label)
  })

  it('names a variable the app doesn’t list by its key', () => {
    expect(showWhenLabel({ key: 'vip', op: 'exists' })).toBe(
      'Only when vip is set'
    )
  })
})
