import { describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { listGroupFields, listGroupLevelsLayout } from './groupBy'

type Show = { name: string; status: string; venue: string }
const field = recordFields<Show>()
const option = (key: 'status' | 'venue') =>
  field.option(key, { label: key, options: [{ value: 'a', label: 'A' }] })
const fields = [
  field.text('name', { label: 'Name' }),
  option('status'),
  option('venue')
]
const keys = (groupBy: string[]) =>
  listGroupFields(fields, { type: 'list', groupBy }).map(({ key }) => key)

describe('listGroupFields', () => {
  it("reads every level of the view's groupBy, in order", () => {
    expect(keys(['venue', 'status'])).toEqual(['venue', 'status'])
    expect(listGroupFields(fields, { type: 'grid' })).toEqual([])
  })

  it('stops at a level that cannot group, or repeats one', () => {
    expect(keys(['status', 'name', 'venue'])).toEqual(['status'])
    expect(keys(['status', 'status'])).toEqual(['status'])
  })
})

describe('listGroupLevelsLayout', () => {
  it('saves the levels picked, or none, keeping the fields', () => {
    expect(
      listGroupLevelsLayout({ type: 'list', fields: ['name'] }, ['status'])
    ).toEqual({ type: 'list', fields: ['name'], groupBy: ['status'] })
    expect(
      listGroupLevelsLayout({ type: 'list', groupBy: ['status'] }, [])
    ).toEqual({ type: 'list' })
  })
})
