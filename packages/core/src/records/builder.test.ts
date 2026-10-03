import { describe, expect, expectTypeOf, it } from 'vitest'

import { recordFields } from './builder'
import type { RecordField } from './types'

type Session = {
  name: string
  start: string
  finish: string
  zone: string
  startLocal: string
  gross: number
  currency: string
  status: string
  sold: number
  featured: boolean
}

const field = recordFields<Session>()

describe('recordFields', () => {
  it('builds a field of each type with its key, label and options', () => {
    const fields: RecordField[] = [
      field.text('name', { label: 'Session', match: /^S\d+$/ }),
      field.date('start', {
        label: 'Starts',
        end: 'finish',
        moment: 'event',
        timeZoneKey: 'zone',
        localDateKey: 'startLocal'
      }),
      field.option('status', {
        label: 'Status',
        status: { on_sale: { intent: 'success' } }
      }),
      field.money('gross', { label: 'Gross', currencyKey: 'currency' }),
      field.number('sold', { label: 'Sold', format: 'compact' }),
      field.boolean('featured', { label: 'Featured', filterable: false })
    ]
    expect(fields).toEqual([
      { key: 'name', type: 'text', label: 'Session', match: /^S\d+$/ },
      {
        key: 'start',
        type: 'date',
        label: 'Starts',
        end: 'finish',
        moment: 'event',
        timeZoneKey: 'zone',
        localDateKey: 'startLocal'
      },
      {
        key: 'status',
        type: 'option',
        label: 'Status',
        status: { on_sale: { intent: 'success' } }
      },
      {
        key: 'gross',
        type: 'money',
        label: 'Gross',
        currencyKey: 'currency'
      },
      { key: 'sold', type: 'number', label: 'Sold', format: 'compact' },
      {
        key: 'featured',
        type: 'boolean',
        label: 'Featured',
        filterable: false
      }
    ])
  })

  it('only takes keys the row has', () => {
    // @ts-expect-error not a key of Session
    field.text('venue', { label: 'Venue' })
    // @ts-expect-error not a key of Session
    field.money('gross', { label: 'Gross', currencyKey: 'cur' })
    expectTypeOf(
      field.text('name', { label: 'Name' }).key
    ).toEqualTypeOf<'name'>()
  })
})
