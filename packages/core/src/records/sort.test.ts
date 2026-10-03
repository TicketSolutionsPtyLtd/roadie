import { describe, expect, it } from 'vitest'

import { sortRecords } from './sort'
import type { RecordField, RecordSort } from './types'

type Show = {
  id: string
  name?: string | null
  sold?: number | null
  status?: string
  venue?: string
  starts?: string | number | Date | null
  zone?: string
  featured?: boolean
}

const fields: RecordField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'sold', label: 'Sold', type: 'number' },
  {
    key: 'status',
    label: 'Status',
    type: 'option',
    status: {
      on_sale: { intent: 'success', order: 2 },
      announced: { intent: 'info', order: 1 },
      held: { intent: 'neutral' }
    }
  },
  {
    key: 'venue',
    label: 'Venue',
    type: 'option',
    options: [
      { value: 'zz', label: 'Arcadia Hall' },
      { value: 'aa', label: 'The Velvet Room' }
    ]
  },
  {
    key: 'starts',
    label: 'Starts',
    type: 'date',
    moment: 'event',
    timeZoneKey: 'zone'
  },
  { key: 'featured', label: 'Featured', type: 'boolean' }
]

const ids = (rows: Show[], sort: RecordSort[]) =>
  sortRecords(rows, sort, fields, { timeZone: 'Australia/Sydney' }).map(
    (row) => row.id
  )

describe('sortRecords', () => {
  const rows: Show[] = [
    { id: 'a', name: 'ocean 10', sold: 5 },
    { id: 'b', name: 'Ocean 9', sold: null },
    { id: 'c', name: null, sold: 40 },
    { id: 'd', name: 'alex', sold: 12 }
  ]

  it('keeps the given order with no sort', () => {
    expect(ids(rows, [])).toEqual(['a', 'b', 'c', 'd'])
  })

  it('sorts text with numbers in order, ignoring case, empty last', () => {
    expect(ids(rows, [{ field: 'name', direction: 'ascending' }])).toEqual([
      'd',
      'b',
      'a',
      'c'
    ])
    expect(ids(rows, [{ field: 'name', direction: 'descending' }])).toEqual([
      'a',
      'b',
      'd',
      'c'
    ])
  })

  it('sorts numbers, empty last either way', () => {
    expect(ids(rows, [{ field: 'sold', direction: 'descending' }])).toEqual([
      'c',
      'd',
      'a',
      'b'
    ])
    expect(ids(rows, [{ field: 'sold', direction: 'ascending' }])).toEqual([
      'a',
      'd',
      'c',
      'b'
    ])
  })

  it('sorts a status by its order, keys without one last', () => {
    const statuses: Show[] = [
      { id: 'held', status: 'held' },
      { id: 'on', status: 'on_sale' },
      { id: 'none' },
      { id: 'ann', status: 'announced' }
    ]
    expect(
      ids(statuses, [{ field: 'status', direction: 'ascending' }])
    ).toEqual(['ann', 'on', 'held', 'none'])
  })

  it('sorts options by label, not value', () => {
    const venues: Show[] = [
      { id: 'velvet', venue: 'aa' },
      { id: 'arcadia', venue: 'zz' },
      { id: 'unknown', venue: 'Boulevard' }
    ]
    expect(ids(venues, [{ field: 'venue', direction: 'ascending' }])).toEqual([
      'arcadia',
      'unknown',
      'velvet'
    ])
  })

  it('reads a number held for a string option as that option', () => {
    const numbered: RecordField[] = [
      {
        key: 'venue',
        label: 'Venue',
        type: 'option',
        options: [
          { value: '1', label: 'Zinc Hall' },
          { value: '2', label: 'Arcadia Hall' }
        ]
      }
    ]
    expect(
      sortRecords(
        [
          { id: 'z', venue: 1 },
          { id: 'a', venue: 2 }
        ],
        [{ field: 'venue', direction: 'ascending' }],
        numbered,
        { timeZone: 'UTC' }
      ).map((row) => row.id)
    ).toEqual(['a', 'z'])
  })

  it('sorts a list of options by the labels it shows, and a list of statuses by its first in order', () => {
    const lists: RecordField[] = [
      {
        key: 'venues',
        label: 'Venues',
        type: 'option',
        multiple: true,
        options: [
          { value: 'zz', label: 'Arcadia Hall' },
          { value: 'aa', label: 'The Velvet Room' }
        ]
      },
      {
        key: 'states',
        label: 'States',
        type: 'option',
        multiple: true,
        status: {
          late: { intent: 'warning', order: 2 },
          early: { intent: 'info', order: 1 }
        }
      }
    ]
    const rows = [
      { id: 'velvet', venues: ['aa'], states: ['late'] },
      { id: 'arcadia', venues: ['zz', 'aa'], states: ['late', 'early'] }
    ]
    const by = (field: string) =>
      sortRecords(rows, [{ field, direction: 'ascending' }], lists, {
        timeZone: 'UTC'
      }).map((row) => row.id)
    expect(by('venues')).toEqual(['arcadia', 'velvet'])
    expect(by('states')).toEqual(['arcadia', 'velvet'])
  })

  it('sorts dates by instant across zones and stored forms', () => {
    const shows: Show[] = [
      // 9pm in Perth is 11pm in Sydney.
      { id: 'perth', starts: '2026-10-03T21:00', zone: 'Australia/Perth' },
      { id: 'sydney', starts: '2026-10-03T22:00', zone: 'Australia/Sydney' },
      { id: 'epoch', starts: Date.parse('2026-10-03T10:30:00Z') },
      { id: 'date', starts: new Date('2026-10-02T00:00:00Z') },
      { id: 'none', starts: null }
    ]
    expect(ids(shows, [{ field: 'starts', direction: 'ascending' }])).toEqual([
      'date',
      'epoch',
      'sydney',
      'perth',
      'none'
    ])
  })

  it('sorts false before true', () => {
    const flags: Show[] = [
      { id: 'yes', featured: true },
      { id: 'no', featured: false }
    ]
    expect(ids(flags, [{ field: 'featured', direction: 'ascending' }])).toEqual(
      ['no', 'yes']
    )
  })

  it('breaks ties with the next sort, then the given order', () => {
    const shows: Show[] = [
      { id: 'a', name: 'Ocean', sold: 1 },
      { id: 'b', name: 'Alex', sold: 2 },
      { id: 'c', name: 'Ocean', sold: 3 },
      { id: 'd', name: 'Ocean', sold: 3 }
    ]
    expect(
      ids(shows, [
        { field: 'name', direction: 'descending' },
        { field: 'sold', direction: 'descending' }
      ])
    ).toEqual(['c', 'd', 'a', 'b'])
  })

  it('skips a sort on a field it does not know', () => {
    expect(ids(rows, [{ field: 'nope', direction: 'ascending' }])).toEqual([
      'a',
      'b',
      'c',
      'd'
    ])
  })

  it('returns a new array and leaves the input alone', () => {
    const sorted = sortRecords(
      rows,
      [{ field: 'sold', direction: 'ascending' }],
      fields,
      { timeZone: 'UTC' }
    )
    expect(sorted).not.toBe(rows)
    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
