import { describe, expect, it } from 'vitest'

import { checkoutExample } from './examples'
import { biggestDrop, funnelRows } from './steps'

describe('funnelRows', () => {
  it('works out conversion from the first and the previous step', () => {
    const rows = funnelRows(checkoutExample)
    expect(rows[0]).toMatchObject({
      ofFirst: 1,
      ofPrevious: null,
      dropped: null
    })
    expect(rows[3]!.ofFirst).toBeCloseTo(1464 / 12400, 9)
    expect(rows[3]!.ofPrevious).toBeCloseTo(1464 / 2380, 9)
    expect(rows[1]!.dropped).toBe(12400 - 4210)
  })

  it('finds the biggest drop by share lost', () => {
    expect(biggestDrop(funnelRows(checkoutExample))?.label).toBe(
      'Chose tickets'
    )
  })

  it('has no biggest drop for a single step', () => {
    expect(biggestDrop(funnelRows({ steps: [{ label: 'A', value: 5 }] }))).toBe(
      null
    )
  })

  it('survives a zero first step', () => {
    const rows = funnelRows({
      steps: [
        { label: 'A', value: 0 },
        { label: 'B', value: 0 }
      ]
    })
    expect(rows.every((r) => Number.isFinite(r.ofFirst))).toBe(true)
    expect(
      rows.every((r) => r.ofPrevious === null || Number.isFinite(r.ofPrevious))
    ).toBe(true)
  })
})
