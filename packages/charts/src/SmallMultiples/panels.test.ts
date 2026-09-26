import { describe, expect, it } from 'vitest'

import { gatesExample } from './examples'
import { panelsOf, sharedDomain } from './panels'
import { smallMultiplesSummary } from './summary'
import { smallMultiplesTable } from './table'

describe('small multiples', () => {
  it('splits rows by the field, in first-seen order', () => {
    expect(panelsOf(gatesExample).map((p) => p.key)).toEqual([
      'North gate',
      'South gate',
      'River entry',
      'Accessible entry'
    ])
    expect(panelsOf(gatesExample)[0]!.rows).toHaveLength(12)
  })

  it('shares one value domain by default, from zero', () => {
    const domain = sharedDomain(gatesExample)!
    expect(domain[0]).toBe(0)
    expect(domain[1]).toBeGreaterThanOrEqual(300)
    expect(sharedDomain({ ...gatesExample, shared: false })).toBeUndefined()
  })

  it('builds one table with the panel field first', () => {
    const table = smallMultiplesTable(gatesExample)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Gate',
      'Time',
      'Scans'
    ])
    expect(table.rows).toHaveLength(48)
    expect(table.rows[0]).toMatchObject({ gate: 'North gate' })
  })

  it('summarises by the takeaway, or the measure and the split', () => {
    expect(smallMultiplesSummary(gatesExample)).toBe(gatesExample.takeaway)
    expect(
      smallMultiplesSummary({ ...gatesExample, takeaway: undefined })
    ).toBe('Scans by gate, one panel for each of 4 gates')
  })

  it('summarises one panel or none in natural words', () => {
    const untitled = { ...gatesExample, takeaway: undefined }
    expect(
      smallMultiplesSummary({
        ...untitled,
        data: untitled.data.filter((row) => row.gate === 'North gate')
      })
    ).toBe('Scans for North gate')
    expect(smallMultiplesSummary({ ...untitled, data: [] })).toBe(
      'Scans by gate, with no gates to show yet'
    )
  })

  it('shares a domain and a table across line panels', () => {
    const lines = {
      ...gatesExample,
      chart: { kind: 'line', x: 'time', y: 'scans' }
    } satisfies typeof gatesExample
    expect(sharedDomain(lines)![1]).toBeGreaterThanOrEqual(300)
    expect(smallMultiplesTable(lines).rows).toHaveLength(48)
  })
})
