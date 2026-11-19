import { describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { groupRecords, groupableFields } from './groups'

type Show = { id: string; status?: string | null; tags?: string[] }
const field = recordFields<Show>()
const status = field.option('status', {
  label: 'Status',
  status: {
    on_sale: { intent: 'success' },
    sold_out: { intent: 'danger' },
    cancelled: { intent: 'neutral' }
  }
})
const summary = (...statuses: Show['status'][]) =>
  groupRecords(
    statuses.map((value, index) => ({
      id: `show-${index}`,
      row: { id: `show-${index}`, status: value }
    })),
    status
  ).map(({ key, label, rows }) => [key, label, rows.map(({ id }) => id)])

describe('groupRecords', () => {
  it("puts each record in its value's group, in option order, keeping the rows' order and empty groups", () => {
    expect(summary('sold_out', 'on_sale', 'sold_out')).toEqual([
      ['on_sale', 'On sale', ['show-1']],
      ['sold_out', 'Sold out', ['show-0', 'show-2']],
      ['cancelled', 'Cancelled', []]
    ])
  })

  it('follows the options with values that are not options, then the records with none', () => {
    expect(summary(undefined, 'postponed', null, '').slice(3)).toEqual([
      ['postponed', 'postponed', ['show-1']],
      [null, 'No status', ['show-0', 'show-2', 'show-3']]
    ])
  })
})

describe('groupableFields', () => {
  it('keeps single-valued fields with options, as core validates groupBy', () => {
    const fields = [
      status,
      field.text('id', { label: 'ID' }),
      field.option('tags', {
        label: 'Tags',
        multiple: true,
        options: [{ value: 'a', label: 'A' }]
      })
    ]
    expect(groupableFields(fields).map(({ key }) => key)).toEqual(['status'])
  })
})
