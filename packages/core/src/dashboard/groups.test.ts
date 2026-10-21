import { describe, expect, it } from 'vitest'

import { validateDashboard } from './validate'

const scansTable = (fields: Record<string, unknown>) => ({
  version: 1,
  title: 'Entry',
  sections: [
    {
      title: 'Scans',
      cards: [
        {
          id: 'scans',
          kind: 'table',
          size: 'full',
          label: 'Scans by ticket type',
          source: 'Oztix scans.',
          columns: [
            { key: 'pool', header: 'Ticket pool', kind: 'text' },
            { key: 'type', header: 'Ticket type', kind: 'text' },
            { key: 'scans', header: 'Scans', kind: 'number' }
          ],
          rows: [{ pool: 'General', type: 'GA', scans: 400 }],
          ...fields
        }
      ]
    }
  ]
})

const problems = (fields: Record<string, unknown>) =>
  validateDashboard(scansTable(fields)).problems.map(
    ({ path, severity, message }) => ({ path, severity, message })
  )

const at = 'sections[0].cards[0]'

describe('validateDashboard grouped tables', () => {
  it.each([
    { groupBy: ['pool'] },
    { groupBy: ['pool'], defaultExpanded: true },
    { groupBy: ['pool'], defaultExpanded: [['General']] }
  ])('accepts %j', (fields) => {
    const result = validateDashboard(scansTable(fields))
    expect(result.ok).toBe(true)
    expect(result.problems).toEqual([])
  })

  it('rejects a key no column has', () => {
    expect(problems({ groupBy: ['gate'] })).toEqual([
      {
        path: `${at}.groupBy[0]`,
        severity: 'error',
        message: 'No column has the key "gate"'
      }
    ])
  })

  it('rejects a column that is not text or status', () => {
    expect(problems({ groupBy: ['scans'] })).toEqual([
      {
        path: `${at}.groupBy[0]`,
        severity: 'error',
        message: 'Group by a text or status column, not a number column'
      }
    ])
  })

  it('rejects grouping away every column', () => {
    const table = scansTable({ groupBy: ['pool', 'type'] })
    table.sections[0]!.cards[0]!.columns = [
      { key: 'pool', header: 'Ticket pool', kind: 'text' },
      { key: 'type', header: 'Ticket type', kind: 'text' }
    ]
    expect(validateDashboard(table).problems).toContainEqual(
      expect.objectContaining({
        path: `${at}.groupBy`,
        severity: 'error',
        message: 'Leave at least one column ungrouped to show the rows'
      })
    )
  })

  it('warns when the label column left first is not text or status', () => {
    const table = scansTable({ groupBy: ['pool', 'type'] })
    expect(validateDashboard(table).problems).toEqual([
      expect.objectContaining({
        path: `${at}.groupBy`,
        severity: 'warning',
        message:
          'The first column left holds the group labels. Lead with a text or status column'
      })
    ])
  })

  it('warns about a path deeper than the grouping', () => {
    expect(
      problems({ groupBy: ['pool'], defaultExpanded: [['General', 'GA']] })
    ).toEqual([
      {
        path: `${at}.defaultExpanded[0]`,
        severity: 'warning',
        message: 'This path is deeper than groupBy, so it opens nothing'
      }
    ])
  })

  it('needs groupBy for defaultExpanded', () => {
    expect(problems({ defaultExpanded: true })).toEqual([
      {
        path: `${at}.defaultExpanded`,
        severity: 'warning',
        message: 'Set groupBy too, or leave out defaultExpanded'
      }
    ])
  })
})
