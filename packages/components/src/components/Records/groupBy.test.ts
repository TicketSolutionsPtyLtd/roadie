import { describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { groupFields, groupLevelsLayout } from './groupBy'

type Show = {
  name: string
  status: string
  venue: string
  city: string
  tour: string
}
const field = recordFields<Show>()
const option = (key: 'status' | 'venue' | 'city' | 'tour') =>
  field.option(key, { label: key, options: [{ value: 'a', label: 'A' }] })
const fields = [
  field.text('name', { label: 'Name' }),
  option('status'),
  option('venue'),
  option('city'),
  option('tour')
]
const keys = (groupBy: string[]) =>
  groupFields(fields, { type: 'list', groupBy }).map(({ key }) => key)

describe('groupFields', () => {
  it("reads every level of the view's groupBy, in order", () => {
    expect(keys(['venue', 'status'])).toEqual(['venue', 'status'])
    expect(groupFields(fields, { type: 'grid' })).toEqual([])
    expect(
      groupFields(fields, { type: 'table', groupBy: ['city'] }).map(
        ({ key }) => key
      )
    ).toEqual(['city'])
  })

  it('stops at a level that cannot group, or repeats one', () => {
    expect(keys(['status', 'name', 'venue'])).toEqual(['status'])
    expect(keys(['status', 'status'])).toEqual(['status'])
  })

  it('reads at most three levels, as a view allows', () => {
    expect(keys(['status', 'venue', 'city', 'tour'])).toEqual([
      'status',
      'venue',
      'city'
    ])
  })
})

describe('groupLevelsLayout', () => {
  it('saves the levels picked, or none, keeping the fields', () => {
    expect(
      groupLevelsLayout('list', { type: 'list', fields: ['name'] }, ['status'])
    ).toEqual({ type: 'list', fields: ['name'], groupBy: ['status'] })
    expect(
      groupLevelsLayout('list', { type: 'list', groupBy: ['status'] }, [])
    ).toEqual({ type: 'list' })
  })

  it("keeps a table's columns, and starts afresh from another layout", () => {
    expect(
      groupLevelsLayout(
        'table',
        { type: 'table', columns: { hidden: ['city'] } },
        ['status']
      )
    ).toEqual({
      type: 'table',
      columns: { hidden: ['city'] },
      groupBy: ['status']
    })
    expect(
      groupLevelsLayout('table', { type: 'list', fields: ['name'] }, [])
    ).toEqual({ type: 'table' })
  })
})
