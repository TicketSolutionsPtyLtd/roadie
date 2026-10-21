import { describe, expect, it } from 'vitest'

import { plainDateOf } from '../../datetime/plainDate'
import {
  FILTERS,
  type Row,
  VIEWER,
  epoch,
  msRow,
  rows
} from '../agreementCases'
import { momentOf, recordPlaces } from '../fields'
import { matchesRecordQuery } from '../match'
import { resolveRecordQuery } from '../resolve'
import { eventFields } from '../testFields'
import type { RecordFilter } from '../types'
import { toElasticsearch } from './index'
import { evaluateElasticsearch } from './testEvaluator'

type LocalDates = 'dates' | 'date-times'

function localDateTime(instant: number, zone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
    .format(instant)
    .replace(' ', 'T')
}

/** The row as an index would store it, per the adapter's documented shape. */
function toDocument(row: Row, localDates: LocalDates): Row {
  const doc: Row = { ...row }
  const local = (instant: number, zone: string) =>
    localDates === 'dates'
      ? plainDateOf(new Date(instant), zone)
      : localDateTime(instant, zone)
  for (const field of eventFields) {
    if (field.type === 'location' && row[field.key] !== undefined)
      doc[field.key] = recordPlaces(field, row[field.key])
    if (field.type !== 'date' || momentOf(field) === 'date') continue
    const start = row[field.key]
    if (start === undefined || start === null) continue
    const zone =
      (field.timeZoneKey && (row[field.timeZoneKey] as string)) || VIEWER
    const end = (field.end && row[field.end]) ?? start
    doc[field.key] = epoch(start, zone)
    if (field.end) doc[field.end] = epoch(end, zone)
    if (field.localDateKey) {
      doc[field.localDateKey] = local(epoch(start, zone), zone)
    }
    if (field.endLocalDateKey) {
      doc[field.endLocalDateKey] = local(epoch(end, zone), zone)
    }
  }
  // An index holds JSON, where undefined keys do not exist.
  return JSON.parse(JSON.stringify(doc)) as Row
}

describe.each<LocalDates>(['dates', 'date-times'])(
  'the browser predicate and the Elasticsearch adapter agree, local %s',
  (localDates) => {
    const docs = [...rows, msRow]
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
            const { query: dsl } = toElasticsearch(
              { version: 1, query: resolved },
              eventFields
            )
            const browser = docs
              .filter((row) => matchesRecordQuery(row, resolved, eventFields))
              .map((row) => row.id)
            const elasticsearch = docs
              .filter((row) =>
                evaluateElasticsearch(dsl, toDocument(row, localDates))
              )
              .map((row) => row.id)
            expect(browser).toEqual(elasticsearch)
          }
        )
      }
    )
  }
)
