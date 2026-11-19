import { describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { listGroupField, listGroupLayout } from './groupBy'

type Show = { name: string; status: string; city: string }
const field = recordFields<Show>()
const options = [{ value: 'a', label: 'A' }]
const fields = [
  field.text('name', { label: 'Name' }),
  field.option('status', { label: 'Status', options }),
  field.option('city', { label: 'City', options })
]
const config = { title: 'name', groupBy: 'status' } as const

describe('listGroupField', () => {
  it("groups by the view's field over the definition's", () => {
    expect(
      listGroupField(config, fields, { type: 'list', groupBy: 'city' })?.key
    ).toBe('city')
  })

  it("falls back to the definition's when the view's field can't group", () => {
    expect(
      listGroupField(config, fields, { type: 'list', groupBy: 'name' })?.key
    ).toBe('status')
  })
})

describe('listGroupLayout', () => {
  it("saves no groupBy for the definition's own field, keeping the fields", () => {
    expect(
      listGroupLayout(config, { type: 'list', fields: ['city'] }, 'status')
    ).toEqual({ type: 'list', fields: ['city'] })
  })

  it('saves another field, or none, as the view picks', () => {
    const ungrouped = { title: 'name' } as const
    expect(listGroupLayout(ungrouped, { type: 'list' }, 'city')).toEqual({
      type: 'list',
      groupBy: 'city'
    })
    expect(
      listGroupLayout(ungrouped, { type: 'list', groupBy: 'city' }, undefined)
    ).toEqual({ type: 'list' })
  })
})
