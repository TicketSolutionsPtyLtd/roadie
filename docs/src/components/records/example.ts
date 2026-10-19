import {
  type RecordField,
  type RecordView,
  parseRecordQuery,
  recordViewToSearchParams,
  toRecordsRequest
} from '@oztix/roadie-core/records'
import { toMeilisearch } from '@oztix/roadie-core/records/meilisearch'

// The page shows these as its fields and view fences; example.test.ts keeps
// them the same.
export const EVENT_FIELDS: RecordField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  {
    key: 'orderNumber',
    label: 'Order number',
    type: 'text',
    match: '^OZ-\\d{5}$'
  },
  {
    key: 'venue',
    label: 'Venue',
    type: 'option',
    options: [
      { value: 'quilted-walrus-room', label: 'The Quilted Walrus Room' },
      { value: 'antler-kettle-hall', label: 'Antler Kettle Hall' }
    ]
  },
  {
    key: 'location',
    label: 'Location',
    type: 'location',
    options: [
      { value: 'au', label: 'Australia', kind: 'country' },
      { value: 'au-vic', label: 'Victoria', kind: 'state', parent: 'au' },
      {
        value: 'au-vic-melbourne',
        label: 'Melbourne',
        kind: 'city',
        parent: 'au-vic'
      },
      {
        value: 'au-vic-fitzroy',
        label: 'Fitzroy',
        kind: 'suburb',
        parent: 'au-vic-melbourne'
      },
      {
        value: 'au-nsw',
        label: 'New South Wales',
        kind: 'state',
        parent: 'au'
      },
      {
        value: 'au-nsw-sydney',
        label: 'Sydney',
        kind: 'city',
        parent: 'au-nsw'
      }
    ]
  },
  {
    key: 'offer',
    label: 'Availability',
    type: 'option',
    status: {
      available: { intent: 'success', order: 1 },
      selling_fast: { intent: 'warning', order: 2 },
      sold_out: { intent: 'danger', order: 3 }
    }
  },
  { key: 'gross', label: 'Gross', type: 'money', currencyKey: 'currency' },
  {
    key: 'starts',
    label: 'Start date',
    type: 'date',
    moment: 'event',
    end: 'ends',
    timeZoneKey: 'venueZone',
    localDateKey: 'startsLocal',
    endLocalDateKey: 'endsLocal'
  },
  { key: 'created', label: 'Created', type: 'date', moment: 'timestamp' }
]

export const WEEKEND_VIEW: RecordView = {
  version: 1,
  id: 'melbourne-weekend',
  name: 'Melbourne this weekend',
  entity: 'events',
  query: {
    search: 'lampshade',
    filters: [
      { field: 'location', operator: 'is', values: ['au-vic-melbourne'] },
      { field: 'starts', operator: 'within', value: 'this-weekend' },
      { field: 'offer', operator: 'is-not', values: ['sold_out'] }
    ],
    sort: [{ field: 'starts', direction: 'ascending' }]
  },
  layout: {
    type: 'table',
    columns: { order: ['name', 'gross', 'starts'], hidden: ['created'] }
  }
}

/** The example view's first page as the request a server reads. */
export const weekendRequest = () =>
  toRecordsRequest(
    WEEKEND_VIEW.query,
    EVENT_FIELDS,
    { now: new Date(EXAMPLE_NOW), timeZone: EXAMPLE_ZONE },
    { page: 0, pageSize: 50 }
  )

/** A fixed moment, so the outputs read the same on every build. */
export const EXAMPLE_NOW = '2026-10-02T13:30:00Z'
export const EXAMPLE_NOW_LABEL = '11:30pm Friday in Melbourne'
export const EXAMPLE_ZONE = 'Australia/Melbourne'

/** A call, then what it returns as comment lines. */
export function callAndResult(call: string, result: unknown) {
  const lines = JSON.stringify(result, null, 2).split('\n')
  return `${call}\n// ${lines.join('\n// ')}`
}

const QUERY_TEXT = 'melb this weekend'

/** What `parseRecordQuery` suggests for some typed text, trimmed to the parts the page explains. */
export function querySuggestionsExample() {
  const suggestions = parseRecordQuery(QUERY_TEXT, {
    fields: EVENT_FIELDS,
    now: new Date(EXAMPLE_NOW),
    timeZone: EXAMPLE_ZONE,
    limit: 4
  }).map(({ kind, label, remainder }) => ({ kind, label, remainder }))
  return callAndResult(
    `parseRecordQuery('${QUERY_TEXT}', { fields: eventFields, now, timeZone })`,
    suggestions
  )
}

/** The example view as Meilisearch parameters, worked out by `toMeilisearch`. */
export function viewMeilisearchExample() {
  const params = toMeilisearch(WEEKEND_VIEW, EVENT_FIELDS, {
    now: new Date(EXAMPLE_NOW),
    timeZone: EXAMPLE_ZONE
  })
  const call = `toMeilisearch(view, eventFields, {
  now: new Date('${EXAMPLE_NOW}'), // ${EXAMPLE_NOW_LABEL}
  timeZone: '${EXAMPLE_ZONE}'
})`
  return callAndResult(call, params)
}

/** The example view on its first page, as `recordViewToSearchParams` writes it, one param a line. */
export const viewSearchParamsExample = () =>
  [...recordViewToSearchParams(WEEKEND_VIEW, { page: 0 })]
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
