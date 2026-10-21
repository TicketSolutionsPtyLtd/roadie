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
import { toMeilisearch } from './index'
import { evaluateMeilisearch } from './testEvaluator'

/** The row as an index would store it, per the adapter's documented shape. */
function toDocument(row: Row, scale: number): Row {
  const doc: Row = { ...row }
  for (const field of eventFields) {
    if (field.type === 'location' && row[field.key] !== undefined)
      doc[field.key] = recordPlaces(field, row[field.key])
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
              { version: 1, query: resolved },
              eventFields,
              { epoch: epochUnit }
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
