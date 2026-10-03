import { describe, expect, it } from 'vitest'

import { plainDateOf } from '../../datetime/plainDate'
import { resolveAbsolute } from '../../datetime/ranges'
import { momentOf } from '../fields'
import { matchesRecordQuery } from '../match'
import { resolveRecordQuery } from '../resolve'
import { eventFields, eventRows } from '../testFields'
import type { RecordFilter } from '../types'
import { toMeilisearch } from './index'
import { evaluateMeilisearch } from './testEvaluator'

const VIEWER = 'Australia/Sydney'
type Row = Record<string, unknown>

function epoch(value: unknown, zone: string): number {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  const span = resolveAbsolute(
    { start: String(value), end: String(value) },
    zone
  )
  if (span.kind !== 'instants') throw new Error('Expected an instant')
  return span.start!
}

/** The row as an index would store it, per the adapter's documented shape. */
function toDocument(row: Row, scale: number): Row {
  const doc: Row = { ...row }
  for (const field of eventFields) {
    if (field.type !== 'date' || momentOf(field) === 'date') continue
    const start = row[field.key]
    if (start === undefined || start === null) continue
    const zone =
      (field.timeZoneKey && (row[field.timeZoneKey] as string)) || VIEWER
    const end = (field.end && row[field.end]) ?? start
    doc[field.key] = Math.floor(epoch(start, zone) / scale)
    if (field.end) doc[field.end] = Math.floor(epoch(end, zone) / scale)
    if (field.localDateKey) {
      doc[field.localDateKey] = plainDateOf(new Date(epoch(start, zone)), zone)
    }
    if (field.endLocalDateKey) {
      doc[field.endLocalDateKey] = plainDateOf(new Date(epoch(end, zone)), zone)
    }
  }
  // An index holds JSON, where undefined keys do not exist.
  return JSON.parse(JSON.stringify(doc)) as Row
}

const rows: Row[] = [
  ...Object.values(eventRows),
  { id: 'empty-object', venue: {}, genres: ['jazz'], capacity: 400 },
  { id: 'listed-capacity', capacity: [400, 900], name: 'Two Rooms' },
  {
    id: 'quoted',
    venue: 'say "hi" a\\b',
    featured: 'true',
    onSale: '2026-10-05T09:00:00+08:00',
    zone: 'Australia/Perth',
    birthday: '2026-10-03'
  }
]

// Seconds lose the milliseconds, so this row only agrees with a millisecond index.
const msRow: Row = { id: 'ms', created: Date.parse('2026-10-03T01:59:59.700Z') }

const FILTERS: RecordFilter[] = [
  { field: 'venue', operator: 'is', values: ['say "hi" a\\b', 'velvet-room'] },
  { field: 'venue', operator: 'is-not', values: ['SAY "HI" A\\B', 'nope'] },
  { field: 'onSale', operator: 'within', value: 'next-week' },
  { field: 'onSale', operator: 'after', value: '2026-10-04' },
  { field: 'onSale', operator: 'within', value: 'upcoming' },
  { field: 'birthday', operator: 'within', value: 'upcoming' },
  { field: 'birthday', operator: 'within', value: 'ongoing' },
  {
    field: 'created',
    operator: 'after',
    value: '2026-10-03T11:59:59.500+10:00'
  },
  { field: 'created', operator: 'within', value: 'past' },
  {
    field: 'venue',
    operator: 'is',
    values: ['velvet-room', 'swan-lane-social']
  },
  { field: 'venue', operator: 'is', values: ['VELVET-ROOM'] },
  { field: 'venue', operator: 'is-not', values: ['velvet-room'] },
  { field: 'venue', operator: 'is-set' },
  { field: 'venue', operator: 'is-not-set' },
  { field: 'genres', operator: 'is', values: ['folk', 'comedy'] },
  { field: 'genres', operator: 'is-not', values: ['jazz', 'folk'] },
  { field: 'genres', operator: 'has-all', values: ['jazz', 'folk'] },
  { field: 'genres', operator: 'is-not-set' },
  { field: 'name', operator: 'contains', value: 'LAUGH' },
  { field: 'name', operator: 'not-contains', value: 'nights' },
  { field: 'name', operator: 'is', values: ['neon nights'] },
  { field: 'capacity', operator: 'eq', value: 400 },
  { field: 'capacity', operator: 'neq', value: 400 },
  { field: 'capacity', operator: 'lt', value: 5000 },
  { field: 'capacity', operator: 'gt', value: 400 },
  { field: 'capacity', operator: 'between', value: [400, 5000] },
  { field: 'capacity', operator: 'is-set' },
  { field: 'gross', operator: 'eq', value: 0 },
  { field: 'featured', operator: 'is-true' },
  { field: 'featured', operator: 'is-false' },
  { field: 'starts', operator: 'on', value: '2026-10-03' },
  { field: 'starts', operator: 'on', value: '2026-10-05' },
  { field: 'starts', operator: 'before', value: '2026-10-02' },
  { field: 'starts', operator: 'after', value: '2026-10-04' },
  { field: 'starts', operator: 'between', value: ['2026-10-04', '2026-10-10'] },
  { field: 'starts', operator: 'within', value: 'today' },
  { field: 'starts', operator: 'within', value: 'this-weekend' },
  { field: 'starts', operator: 'within', value: 'next-week' },
  { field: 'starts', operator: 'within', value: 'upcoming' },
  { field: 'starts', operator: 'within', value: 'past' },
  {
    field: 'starts',
    operator: 'within',
    value: { direction: 'next', amount: 2, unit: 'hour' }
  },
  { field: 'created', operator: 'on', value: '2026-09-01' },
  { field: 'created', operator: 'on', value: '2026-08-29' },
  { field: 'created', operator: 'before', value: '2026-08-16' },
  {
    field: 'created',
    operator: 'within',
    value: { period: 'month', offset: -1 }
  },
  { field: 'birthday', operator: 'on', value: '1990-10-03' },
  { field: 'birthday', operator: 'within', value: 'past' }
]

describe.each([
  ['seconds', 1000, rows],
  ['milliseconds', 1, [...rows, msRow]]
] as const)(
  'the browser predicate and the Meilisearch adapter agree, epoch in %s',
  (epochUnit, scale, docs) => {
    describe.each(['2026-10-03T02:00:00Z', '2026-10-03T08:00:00Z'])(
      'at %s',
      (now) => {
        it.each(FILTERS.map((filter) => [JSON.stringify(filter), filter]))(
          '%s',
          (_, filter) => {
            const options = { now: new Date(now), timeZone: VIEWER }
            const query = {
              search: '',
              filters: [filter as RecordFilter],
              sort: []
            }
            const resolved = resolveRecordQuery(query, eventFields, options)
            const [expression] = toMeilisearch(
              { query, layout: { type: 'table' } },
              eventFields,
              { ...options, epoch: epochUnit }
            ).filter
            const browser = docs
              .filter((row) => matchesRecordQuery(row, resolved, eventFields))
              .map((row) => row.id)
            const meilisearch = docs
              .filter((row) =>
                evaluateMeilisearch(expression!, toDocument(row, scale))
              )
              .map((row) => row.id)
            expect(browser).toEqual(meilisearch)
          }
        )
      }
    )
  }
)
