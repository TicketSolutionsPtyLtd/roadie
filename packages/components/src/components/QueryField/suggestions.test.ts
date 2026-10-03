import { describe, expect, it } from 'vitest'

import { exactSuggestion, listGroups, searchSuggestion } from './suggestions'
import type { QueryFieldSuggestionGroup } from './types'

const venue = {
  id: 'venue',
  label: 'Venue',
  kind: 'field',
  value: 'venue'
} as const
const iguana = {
  id: 'venue:iguana',
  label: 'Venue is Iguana Teapot Hall',
  kind: 'filter',
  value: 'iguana'
} as const
const order = {
  id: 'order:1042',
  label: 'Order 1042',
  kind: 'record',
  value: 1042,
  exact: true
} as const

const fields: QueryFieldSuggestionGroup = {
  id: 'fields',
  label: 'Fields',
  items: [venue]
}
const filters: QueryFieldSuggestionGroup = {
  id: 'filters',
  label: 'Filters',
  items: [iguana]
}

describe('searchSuggestion', () => {
  it('quotes the trimmed text', () => {
    expect(searchSuggestion('  lampshade disco ')).toEqual({
      id: 'search',
      kind: 'search',
      label: 'Search for “lampshade disco”',
      value: 'lampshade disco'
    })
  })
})

describe('listGroups', () => {
  it.each([
    {
      name: 'appends a search group after the given groups',
      input: { groups: [filters, fields], inputValue: 'long' },
      ids: ['filters', 'fields', 'search']
    },
    {
      name: 'adds no search group for blank text',
      input: { groups: [fields], inputValue: '   ' },
      ids: ['fields']
    },
    {
      name: 'puts recent items first on empty text',
      input: { groups: [fields], inputValue: '', recent: [iguana] },
      ids: ['recent', 'fields']
    },
    {
      name: 'hides recent items once there is text',
      input: { groups: [fields], inputValue: 'v', recent: [iguana] },
      ids: ['fields', 'search']
    },
    {
      name: 'offers no free-text search while a chip is pending',
      input: { groups: [filters], inputValue: 'long', pending: true },
      ids: ['filters']
    },
    {
      name: 'keeps recent items out of the value step',
      input: {
        groups: [fields],
        inputValue: '',
        recent: [iguana],
        pending: true
      },
      ids: ['fields']
    },
    {
      name: 'drops empty groups',
      input: {
        groups: [{ id: 'none', label: 'None', items: [] }, fields],
        inputValue: ''
      },
      ids: ['fields']
    }
  ])('$name', ({ input, ids }) => {
    expect(listGroups(input).map((group) => group.id)).toEqual(ids)
  })
})

describe('exactSuggestion', () => {
  it.each([
    {
      name: 'finds an exact match',
      groups: [filters, { ...fields, items: [order] }],
      id: 'order:1042'
    },
    {
      name: 'ignores items without the flag',
      groups: [filters, fields],
      id: undefined
    },
    {
      name: 'takes the first of several',
      groups: [{ ...fields, items: [order, { ...order, id: 'order:1043' }] }],
      id: 'order:1042'
    }
  ])('$name', ({ groups, id }) => {
    expect(exactSuggestion(groups)?.id).toBe(id)
  })
})
