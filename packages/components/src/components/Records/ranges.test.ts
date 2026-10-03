import { describe, expect, it } from 'vitest'

import type { RecordQuery } from '@oztix/roadie-core/records'

import { type RangePlan, rangeKey, rangesToLoad } from './ranges'

const plan = (overrides: Partial<RangePlan>): RangePlan => ({
  first: 0,
  last: 15,
  size: 50,
  requested: new Set<number>(),
  failed: new Set<number>(),
  pending: 0,
  nextStart: 0,
  ended: false,
  ...overrides
})

describe('rangesToLoad with rowCount', () => {
  it('requests the window plus a screen either side, aligned to size', () => {
    expect(
      rangesToLoad(plan({ first: 120, last: 135, rowCount: 1000 }))
    ).toEqual([
      { start: 100, end: 150 },
      { start: 150, end: 200 }
    ])
  })

  it('never requests a range already requested or failed', () => {
    expect(
      rangesToLoad(
        plan({
          first: 120,
          last: 135,
          rowCount: 1000,
          requested: new Set([100]),
          failed: new Set([150])
        })
      )
    ).toEqual([])
  })

  it.each([0, -3, Number.NaN, 0.5])(
    'treats a size of %s as one, so planning ends',
    (size) => {
      expect(
        rangesToLoad(plan({ first: 0, last: 1, size, rowCount: 3 }))
      ).toEqual([
        { start: 0, end: 1 },
        { start: 1, end: 2 },
        { start: 2, end: 3 }
      ])
    }
  )

  it('skips a range already held', () => {
    expect(
      rangesToLoad(
        plan({
          first: 120,
          last: 135,
          rowCount: 1000,
          held: (range) => range.start === 100
        })
      )
    ).toEqual([{ start: 150, end: 200 }])
  })

  it('asks for the whole last page, past rowCount', () => {
    expect(
      rangesToLoad(plan({ first: 990, last: 999, rowCount: 1010 }))
    ).toEqual([
      { start: 950, end: 1000 },
      { start: 1000, end: 1050 }
    ])
  })

  it('requests nothing for an empty result', () => {
    expect(rangesToLoad(plan({ rowCount: 0 }))).toEqual([])
  })
})

describe('rangesToLoad without rowCount', () => {
  it('requests the first range', () => {
    expect(rangesToLoad(plan({}))).toEqual([{ start: 0, end: 50 }])
  })

  it('requests only the next range, one at a time', () => {
    const next = { first: 40, last: 55, requested: new Set([0]), nextStart: 50 }
    expect(rangesToLoad(plan(next))).toEqual([{ start: 50, end: 100 }])
    expect(rangesToLoad(plan({ ...next, pending: 1 }))).toEqual([])
  })

  it('starts a page from rows held past a page boundary', () => {
    expect(
      rangesToLoad(plan({ first: 100, last: 115, nextStart: 120 }))
    ).toEqual([{ start: 100, end: 150 }])
  })

  it('waits while the next range is more than a screen away', () => {
    expect(
      rangesToLoad(
        plan({ first: 0, last: 15, requested: new Set([0]), nextStart: 50 })
      )
    ).toEqual([])
  })

  it('keeps going towards a restore target', () => {
    expect(
      rangesToLoad(
        plan({ requested: new Set([0]), nextStart: 50, target: 480 })
      )
    ).toEqual([{ start: 50, end: 100 }])
  })

  it('stops at the row limit', () => {
    expect(
      rangesToLoad(plan({ first: 299_990, last: 299_999, nextStart: 300_000 }))
    ).toEqual([])
  })

  it('stops once ended or after a failure', () => {
    expect(rangesToLoad(plan({ ended: true }))).toEqual([])
    expect(rangesToLoad(plan({ failed: new Set([0]) }))).toEqual([])
  })
})

describe('rangeKey', () => {
  const query = (overrides: Partial<RecordQuery> = {}): RecordQuery => ({
    search: '',
    filters: [],
    sort: [],
    ...overrides
  })

  it('ignores chip value order and a trailing space', () => {
    expect(
      rangeKey(
        query({
          search: 'Perth ',
          filters: [
            { field: 'city', operator: 'is', values: ['Perth', 'Hobart'] }
          ]
        }),
        'Australia/Perth'
      )
    ).toBe(
      rangeKey(
        query({
          search: 'Perth',
          filters: [
            { field: 'city', operator: 'is', values: ['Hobart', 'Perth'] }
          ]
        }),
        'Australia/Perth'
      )
    )
  })

  it('changes with search, filters, sort and zone', () => {
    const base = rangeKey(query(), 'UTC')
    expect(rangeKey(query({ search: 'Perth' }), 'UTC')).not.toBe(base)
    expect(
      rangeKey(
        query({
          filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
        }),
        'UTC'
      )
    ).not.toBe(base)
    expect(
      rangeKey(
        query({ sort: [{ field: 'show', direction: 'ascending' }] }),
        'UTC'
      )
    ).not.toBe(base)
    expect(rangeKey(query(), 'Australia/Sydney')).not.toBe(base)
  })
})
