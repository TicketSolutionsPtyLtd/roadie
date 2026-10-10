import {
  type RecordField,
  type RecordView,
  parseQuery,
  toSearchParams
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
    match: /^OZ-\d{5}$/i
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
    key: 'city',
    label: 'City',
    type: 'option',
    options: [
      { value: 'melbourne', label: 'Melbourne' },
      { value: 'sydney', label: 'Sydney' }
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
    label: 'Starts',
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
  id: 'melbourne-weekend',
  name: 'Melbourne this weekend',
  entity: 'events',
  query: {
    search: 'lampshade',
    filters: [
      { field: 'city', operator: 'is', values: ['melbourne'] },
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

/** What `parseQuery` suggests for some typed text, trimmed to the parts the page explains. */
export function querySuggestionsExample() {
  const suggestions = parseQuery(QUERY_TEXT, {
    fields: EVENT_FIELDS,
    now: new Date(EXAMPLE_NOW),
    timeZone: EXAMPLE_ZONE,
    limit: 4
  }).map(({ kind, label, remainder }) => ({ kind, label, remainder }))
  return callAndResult(
    `parseQuery('${QUERY_TEXT}', { fields: eventFields, now, timeZone })`,
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

/** The example view on its first page, as `toSearchParams` writes it, one param a line. */
export const viewSearchParamsExample = () =>
  [...toSearchParams(WEEKEND_VIEW, { page: 0 })]
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
