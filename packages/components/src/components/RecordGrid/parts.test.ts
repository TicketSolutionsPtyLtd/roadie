import { describe, expect, it } from 'vitest'

import { type RecordLayout, recordFields } from '@oztix/roadie-core/records'

import {
  detailCandidates,
  gridDetailsLayout,
  gridParts,
  shownDetails
} from './parts'
import type { GridLayoutConfig } from './types'

const field = recordFields()
const fields = [
  field.text('name', { label: 'Event' }),
  field.text('image', { label: 'Image', searchable: false }),
  field.text('venue', { label: 'Venue' }),
  field.text('city', { label: 'City' }),
  field.number('sold', { label: 'Sold' }),
  field.money('gross', { label: 'Gross' })
]
const config: GridLayoutConfig = {
  title: 'name',
  image: 'image',
  description: 'venue',
  details: ['city', 'sold']
}
const keys = (layout: RecordLayout) =>
  gridParts(config, fields, layout).details.map((part) => part.key)

describe('gridParts', () => {
  it('places each part and lists the defined details', () => {
    const parts = gridParts(config, fields, { type: 'grid' })
    expect(parts.title?.key).toBe('name')
    expect(parts.image).toMatchObject({ key: 'image', kind: 'image' })
    expect(parts.description?.key).toBe('venue')
    expect(parts.leading).toBeUndefined()
    expect(parts.details.map((part) => part.field.label)).toEqual([
      'City',
      'Sold'
    ])
  })

  it.each<[string, RecordLayout, string[]]>([
    ['the definition without fields', { type: 'grid' }, ['city', 'sold']],
    [
      "the definition for another layout's view",
      { type: 'table' },
      ['city', 'sold']
    ],
    [
      'the view’s fields in order',
      { type: 'grid', fields: ['gross', 'city'] },
      ['gross', 'city']
    ],
    [
      'no unknown, placed or repeated keys',
      { type: 'grid', fields: ['fees', 'name', 'sold', 'sold'] },
      ['sold']
    ]
  ])('shows %s', (_, layout, expected) => {
    expect(keys(layout)).toEqual(expected)
  })

  it('keeps a defined part’s cell when the view lists it', () => {
    const cell = () => 'cell'
    const parts = gridParts(
      { ...config, details: [{ key: 'sold', cell }] },
      fields,
      { type: 'grid', fields: ['gross', 'sold'] }
    )
    expect(parts.details[1]).toMatchObject({ key: 'sold', cell })
    expect(parts.details[0]!.cell).toBeUndefined()
  })

  it('skips parts naming fields that don’t exist', () => {
    const parts = gridParts(
      { title: 'missing', details: ['city', 'nope'] },
      fields,
      { type: 'grid' }
    )
    expect(parts.title).toBeUndefined()
    expect(parts.details.map((part) => part.key)).toEqual(['city'])
  })
})

describe('detailCandidates', () => {
  it('lists every field the card doesn’t place', () => {
    expect(detailCandidates(config, fields).map((f) => f.key)).toEqual([
      'city',
      'sold',
      'gross'
    ])
  })
})

describe('shownDetails', () => {
  it('reads a table view as the definition', () => {
    expect(
      shownDetails(config, fields, {
        type: 'table',
        columns: { hidden: ['city'] }
      })
    ).toEqual(['city', 'sold'])
  })
})

describe('gridDetailsLayout', () => {
  it.each<[string, string[], RecordLayout, RecordLayout]>([
    [
      'leaves out fields back to the definition',
      ['city', 'sold'],
      { type: 'grid', fields: ['sold'] },
      { type: 'grid' }
    ],
    [
      'writes a new order',
      ['sold', 'city'],
      { type: 'grid' },
      { type: 'grid', fields: ['sold', 'city'] }
    ],
    [
      'writes a hidden detail',
      ['sold'],
      { type: 'grid' },
      { type: 'grid', fields: ['sold'] }
    ],
    [
      'writes a shown field at the end',
      ['city', 'sold', 'gross'],
      { type: 'grid' },
      { type: 'grid', fields: ['city', 'sold', 'gross'] }
    ],
    [
      'writes from a table view',
      ['sold'],
      { type: 'table' },
      { type: 'grid', fields: ['sold'] }
    ],
    [
      'keeps unknown keys in their slots',
      ['sold', 'city'],
      { type: 'grid', fields: ['fees', 'city', 'sold'] },
      { type: 'grid', fields: ['fees', 'sold', 'city'] }
    ],
    [
      'keeps unknown keys back at the definition',
      ['city', 'sold'],
      { type: 'grid', fields: ['city', 'fees'] },
      { type: 'grid', fields: ['city', 'fees', 'sold'] }
    ],
    [
      'drops placed, unknown-to-the-row and repeated keys from the change',
      ['name', 'sold', 'sold', 'nope'],
      { type: 'grid' },
      { type: 'grid', fields: ['sold'] }
    ]
  ])('%s', (_, shown, current, expected) => {
    expect(gridDetailsLayout(config, fields, shown, current)).toEqual(expected)
  })

  it('round-trips through gridParts', () => {
    const layout = gridDetailsLayout(config, fields, ['gross', 'city'], {
      type: 'grid'
    })
    expect(keys(layout)).toEqual(['gross', 'city'])
  })
})
