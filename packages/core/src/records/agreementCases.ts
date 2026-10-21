/**
 * Rows and filters every index adapter's agreement test runs, so each one
 * is held to the same cases as the browser predicate. Test-only.
 */
import { rowInstant } from './bounds'
import { eventRows } from './testFields'
import type { RecordFilter } from './types'

export const VIEWER = 'Australia/Sydney'
export type Row = Record<string, unknown>

export function epoch(value: unknown, zone: string): number {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  return rowInstant(String(value), zone)
}

export const rows: Row[] = [
  ...Object.values(eventRows),
  { id: 'suburb', city: 'fitzroy' },
  { id: 'empty-object', venue: {}, genres: ['jazz'], capacity: 400 },
  { id: 'blank-genre', genres: ['', 'jazz'] },
  { id: 'listed-capacity', capacity: [400, 900], name: 'Two Rooms' },
  { id: 'gap', created: '2026-10-04T02:30' },
  { id: 'day', created: '2026-10-03' },
  { id: 'repeat', created: '2026-04-05T02:30' },
  { id: 'jump', created: '2026-10-04T03:00' },
  { id: 'backslashes', venue: 'two\\\\', name: 'Even \\\\"quoted\\\\"' },
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
export const msRow: Row = {
  id: 'ms',
  created: Date.parse('2026-10-03T01:59:59.700Z')
}

export const FILTERS: RecordFilter[] = [
  {
    field: 'created',
    operator: 'between',
    value: ['2026-10-04T01:00', '2026-10-04T02:30']
  },
  { field: 'created', operator: 'on', value: '2026-10-03T10:00' },
  { field: 'created', operator: 'after', value: '2026-10-03T10:00' },
  { field: 'created', operator: 'on', value: '2026-10-03' },
  { field: 'created', operator: 'after', value: '2026-04-05T02:15' },
  {
    field: 'created',
    operator: 'between',
    value: ['2026-04-05T02:40', '2026-04-05T02:50']
  },
  { field: 'created', operator: 'on', value: '2026-10-04T02:30' },
  { field: 'created', operator: 'on', value: '2026-04-05T02:30' },
  {
    field: 'created',
    operator: 'between',
    value: ['2026-10-04T02:00', '2026-10-04T02:59']
  },
  { field: 'created', operator: 'after', value: '2026-10-04T03:15' },
  { field: 'venue', operator: 'is', values: ['two\\\\'] },
  { field: 'name', operator: 'contains', value: '\\\\"quoted' },
  {
    field: 'venue',
    operator: 'is',
    values: ['say "hi" a\\b', 'quilted-walrus-room']
  },
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
    values: ['quilted-walrus-room', 'drongo-bell-social-club']
  },
  { field: 'venue', operator: 'is', values: ['QUILTED-WALRUS-ROOM'] },
  { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] },
  { field: 'venue', operator: 'is-set' },
  { field: 'venue', operator: 'is-not-set' },
  { field: 'city', operator: 'is', values: ['victoria'] },
  { field: 'city', operator: 'is', values: ['melbourne', 'perth'] },
  { field: 'city', operator: 'is-not', values: ['melbourne'] },
  { field: 'city', operator: 'is', values: ['FITZROY'] },
  { field: 'genres', operator: 'is', values: ['folk', 'comedy'] },
  { field: 'genres', operator: 'is-not', values: ['jazz', 'folk'] },
  { field: 'genres', operator: 'has-all', values: ['jazz', 'folk'] },
  { field: 'genres', operator: 'is-set' },
  { field: 'genres', operator: 'is-not-set' },
  { field: 'name', operator: 'contains', value: 'POSSUM' },
  { field: 'name', operator: 'not-contains', value: 'disco' },
  { field: 'name', operator: 'is', values: ['lampshade disco'] },
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
