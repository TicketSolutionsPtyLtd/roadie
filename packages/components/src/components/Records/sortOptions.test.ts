import { describe, expect, it } from 'vitest'

import { type RecordField, recordFields } from '@oztix/roadie-core/records'

import {
  addSort,
  firstDirection,
  sortDirectionLabel,
  sortableFields
} from './sortOptions'

const field = recordFields()
const name = field.text('name', { label: 'Name' })
const venue = field.option('venue', {
  label: 'Venue',
  options: [{ value: 'kazoo', label: 'Kazoo Hollow Room' }]
})
const status = field.option('status', {
  label: 'Status',
  status: { on_sale: { intent: 'success', order: 1 } }
})
const loose = field.option('mood', {
  label: 'Mood',
  status: { calm: { intent: 'neutral' } }
})
const sold = field.number('sold', { label: 'Sold' })
const gross = field.money('gross', { label: 'Gross' })
const starts = field.date('starts', { label: 'Starts', moment: 'date' })
const gift = field.boolean('gift', { label: 'Gift' })
const id = field.text('id', { label: 'ID', sortable: false })

describe('sortDirectionLabel', () => {
  it.each<[RecordField, string, string]>([
    [name, 'A to Z', 'Z to A'],
    [venue, 'A to Z', 'Z to A'],
    [loose, 'A to Z', 'Z to A'],
    [status, 'First to last', 'Last to first'],
    [sold, 'Low to high', 'High to low'],
    [gross, 'Low to high', 'High to low'],
    [starts, 'Earliest first', 'Latest first'],
    [gift, 'No first', 'Yes first']
  ])('names the directions of a %s field', (field, ascending, descending) => {
    expect(sortDirectionLabel(field, 'ascending')).toBe(ascending)
    expect(sortDirectionLabel(field, 'descending')).toBe(descending)
  })
})

describe('firstDirection', () => {
  it.each<[RecordField, string]>([
    [name, 'ascending'],
    [venue, 'ascending'],
    [status, 'ascending'],
    [sold, 'descending'],
    [gross, 'descending'],
    [starts, 'descending'],
    [gift, 'descending']
  ])('starts %s fields the way a header click does', (field, direction) => {
    expect(firstDirection(field)).toBe(direction)
  })
})

describe('sortableFields', () => {
  it('leaves out fields that do not sort', () => {
    expect(sortableFields([name, id, sold]).map((f) => f.key)).toEqual([
      'name',
      'sold'
    ])
  })
})

describe('addSort', () => {
  const fields = [id, name, sold, starts]

  it('adds the first sortable field not sorted yet, its natural way', () => {
    expect(addSort([], fields)).toEqual([
      { field: 'name', direction: 'ascending' }
    ])
    expect(
      addSort([{ field: 'name', direction: 'descending' }], fields)
    ).toEqual([
      { field: 'name', direction: 'descending' },
      { field: 'sold', direction: 'descending' }
    ])
  })

  it('adds nothing once every sortable field is sorted', () => {
    const all = [
      { field: 'name', direction: 'ascending' },
      { field: 'sold', direction: 'ascending' },
      { field: 'starts', direction: 'ascending' }
    ] as const
    expect(addSort(all, fields)).toEqual(all)
  })
})
