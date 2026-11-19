import { describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { listGroupField, listGroupLayout } from './groupBy'

type Show = { name: string; status: string }
const field = recordFields<Show>()
const fields = [
  field.text('name', { label: 'Name' }),
  field.option('status', {
    label: 'Status',
    options: [{ value: 'a', label: 'A' }]
  })
]

describe('listGroupField', () => {
  it("groups by the view's field only when it can group", () => {
    expect(
      listGroupField(fields, { type: 'list', groupBy: 'status' })?.key
    ).toBe('status')
    expect(
      listGroupField(fields, { type: 'list', groupBy: 'name' })
    ).toBeUndefined()
    expect(listGroupField(fields, { type: 'grid' })).toBeUndefined()
  })
})

describe('listGroupLayout', () => {
  it('saves the field picked, or none, keeping the fields', () => {
    expect(
      listGroupLayout({ type: 'list', fields: ['name'] }, 'status')
    ).toEqual({
      type: 'list',
      fields: ['name'],
      groupBy: 'status'
    })
    expect(
      listGroupLayout({ type: 'list', groupBy: 'status' }, undefined)
    ).toEqual({ type: 'list' })
  })
})
