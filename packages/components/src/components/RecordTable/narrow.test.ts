import { describe, expect, it } from 'vitest'

import type { RecordField } from '@oztix/roadie-core/records'

import { narrowLayout, narrowParts } from './narrow'
import type { RecordTableColumn, RecordTableNarrow } from './types'

const column = (
  key: string,
  narrow: RecordTableNarrow,
  type: RecordField['type'] = 'text',
  options: Partial<RecordTableColumn> = {}
): RecordTableColumn => ({
  key,
  field: { key, label: key, type },
  narrow,
  ...options
})

const key = (part: { key: string } | undefined) => part?.key

describe('narrowLayout', () => {
  it('is list rows without a detail column', () => {
    expect(
      narrowLayout([column('show', 'title'), column('city', 'description')])
    ).toBe('list')
  })

  it('is cards once any column is a detail', () => {
    expect(
      narrowLayout([column('show', 'title'), column('sold', 'detail')])
    ).toBe('cards')
  })
})

describe('narrowParts', () => {
  it('maps each role and keeps details in order', () => {
    const parts = narrowParts([
      column('show', 'title'),
      column('city', 'description'),
      column('logo', 'leading'),
      column('status', 'trailing', 'option'),
      column('sold', 'detail', 'number'),
      column('gross', 'detail', 'money'),
      column('notes', 'hidden')
    ])
    expect(key(parts.title)).toBe('show')
    expect(key(parts.description)).toBe('city')
    expect(key(parts.leading)).toBe('logo')
    expect(key(parts.trailing)).toBe('status')
    expect(parts.details.map(key)).toEqual(['sold', 'gross'])
  })

  it('falls back to the pinned text column, then the first text one', () => {
    expect(
      key(
        narrowParts([
          column('sold', 'hidden', 'number'),
          column('city', 'hidden'),
          column('show', 'hidden', 'text', { pin: true })
        ]).title
      )
    ).toBe('show')
    expect(
      key(
        narrowParts([
          column('sold', 'hidden', 'number'),
          column('city', 'hidden')
        ]).title
      )
    ).toBe('city')
  })

  it('never takes an image as the title', () => {
    const parts = narrowParts([
      column('image', 'leading', 'text', { kind: 'image' }),
      column('show', 'hidden')
    ])
    expect(key(parts.title)).toBe('show')
    expect(key(parts.leading)).toBe('image')
  })

  it('takes only the first column for each single role', () => {
    const parts = narrowParts([
      column('a', 'title'),
      column('b', 'title'),
      column('c', 'description'),
      column('d', 'description'),
      column('e', 'leading'),
      column('f', 'leading'),
      column('g', 'trailing'),
      column('h', 'trailing')
    ])
    expect(key(parts.title)).toBe('a')
    expect(key(parts.description)).toBe('c')
    expect(key(parts.leading)).toBe('e')
    expect(key(parts.trailing)).toBe('g')
  })

  it('does not repeat the title as a detail or description', () => {
    const asDetail = narrowParts([column('show', 'detail')])
    expect(key(asDetail.title)).toBe('show')
    expect(asDetail.details).toEqual([])
    const asDescription = narrowParts([column('show', 'description')])
    expect(key(asDescription.title)).toBe('show')
    expect(asDescription.description).toBeUndefined()
  })
})
