import type { ReactNode } from 'react'

import Link from 'next/link'

import { CodePreview } from '@/components/CodePreview'
import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components/code'
import {
  type RecordField,
  type RecordView,
  parseQuery,
  toSearchParams
} from '@oztix/roadie-core/records'
import { toMeilisearch } from '@oztix/roadie-core/records/meilisearch'

export const metadata = {
  title: 'Records model',
  description:
    'Fields describe an entity once. Views save a search, filters, sort and layout as JSON. The same view runs in the browser, on a server, in Meilisearch and in a URL.',
  category: 'Building apps'
}

const FIELDS: RecordField[] = [
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
      { value: 'velvet-room', label: 'The Velvet Room' },
      { value: 'harbourside-hall', label: 'Harbourside Hall' }
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

const FIELDS_CODE = `import type { RecordField } from '@oztix/roadie-core/records'

export const eventFields: RecordField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'orderNumber', label: 'Order number', type: 'text', match: /^OZ-\\d{5}$/i },
  {
    key: 'venue',
    label: 'Venue',
    type: 'option',
    options: [
      { value: 'velvet-room', label: 'The Velvet Room' },
      { value: 'harbourside-hall', label: 'Harbourside Hall' }
    ]
  },
  {
    key: 'offer',
    label: 'Availability',
    type: 'option',
    // The dashboard status map: Badge, sort order and labels from one place.
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
]`

const VIEW: RecordView = {
  id: 'melbourne-weekend',
  name: 'Melbourne this weekend',
  entity: 'events',
  query: {
    search: 'neon',
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

// A fixed moment, so the examples below read the same on every build.
const NOW = new Date('2026-10-02T13:30:00Z')
const ZONE = 'Australia/Melbourne'

const params = [...toSearchParams(VIEW, { page: 0 })]
const meilisearch = toMeilisearch(VIEW, FIELDS, { now: NOW, timeZone: ZONE })
const suggestions = parseQuery('melb this weekend', {
  fields: FIELDS,
  now: NOW,
  timeZone: ZONE,
  limit: 4
}).map(({ kind, label, remainder }) => ({ kind, label, remainder }))

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full border-collapse text-sm'>
        <thead>
          <tr className='border-b border-subtle text-left'>
            {head.map((cell) => (
              <th key={cell} className='py-2 pr-4 font-semibold'>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='[&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_tr]:border-b [&_tr]:border-subtle'>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='grid gap-4'>
      <h2 className='text-display-ui-3 text-strong'>{title}</h2>
      {children}
    </section>
  )
}

export default function RecordsPage() {
  return (
    <div className='grid gap-12'>
      <p className='max-w-prose text-lg text-subtle'>
        Organisers work through lists: events, sessions, orders, attendees,
        customers. <Code>@oztix/roadie-core/records</Code> describes those lists
        once, as plain TypeScript with no components, so a search typed on a
        list screen means the same thing in the browser, on your server, in
        Meilisearch and in a shared link. It is the base{' '}
        <Code>RecordTable</Code> will build on.
      </p>

      <Section title='Fields'>
        <p className='max-w-prose text-subtle'>
          A field describes one fact about a record: its key, its label, its
          type and how it may be filtered, sorted and searched. Keep one field
          list per entity and share it between screens. Every per-row fact is a
          key, never a function, so the same list works in a browser, on a
          server and in an adapter. Field lists are code; views are the JSON.
        </p>
        <CodePreview>{FIELDS_CODE}</CodePreview>
        <Table
          head={['Property', 'Meaning']}
          rows={[
            [
              <Code key='k'>type</Code>,
              'text, option, number, money, date or boolean. It decides which operators fit.'
            ],
            [
              <Code key='k'>filterable</Code>,
              'Defaults to true. Set false to keep a field out of filters and suggestions.'
            ],
            [<Code key='k'>sortable</Code>, 'Defaults to true.'],
            [
              <Code key='k'>searchable</Code>,
              'Free-text search reads it. Defaults to true for text and false otherwise.'
            ],
            [
              <Code key='k'>multiple</Code>,
              'The row holds a list. Is means has any of, is not means has none of, and has all becomes available.'
            ],
            [
              <Code key='k'>end</Code>,
              'For a date range, the key holding the end. Date filters then test overlap.'
            ],
            [
              <Code key='k'>moment</Code>,
              'How a date compares: event, access, timestamp (the default) or date. See Dates below.'
            ],
            [
              <Code key='k'>timeZoneKey</Code>,
              "For event and access moments, the row key holding the venue's IANA zone."
            ],
            [
              <>
                <Code key='k'>localDateKey</Code>,{' '}
                <Code key='e'>endLocalDateKey</Code>
              </>,
              'The stored venue-local date, for adapters that cannot work it out per row.'
            ],
            [
              <Code key='k'>match</Code>,
              'A pattern for identifiers, such as order numbers. Typed text that matches is offered as an exact filter.'
            ],
            [
              <>
                <Code key='k'>currency</Code>, <Code key='e'>currencyKey</Code>
              </>,
              'A fixed ISO code, or the row key holding it.'
            ],
            [
              <Code key='k'>status</Code>,
              'The dashboard status map. An option field with one gets Badge rendering, sorting by order and labels from one definition.'
            ],
            [
              <Code key='k'>options</Code>,
              'The values to pick from, each with an optional parent for hierarchies.'
            ]
          ]}
        />
        <p className='max-w-prose text-subtle'>
          Derived states, such as Selling fast or Sold out, are worked out once
          on the server and arrive as option values. Roadie never bands a
          percentage into a state.
        </p>
      </Section>

      <Section title='Views'>
        <p className='max-w-prose text-subtle'>
          A view is a search, filters, sort and layout, saved under a name. Each
          filter is a chip. Chips are ANDed and the values inside one chip are
          ORed. Query and layout are independent, so the same search reads as a
          table or a grid. Page, scroll row and selection are session state,
          never part of a view.
        </p>
        <CodePreview>{JSON.stringify(VIEW, null, 2)}</CodePreview>
        <Table
          head={['Field type', 'Operators']}
          rows={[
            ['Text', 'contains, not-contains, is, is-not'],
            ['Option', 'is, is-not, and has-all when multiple'],
            ['Number, money', 'eq, neq, lt, gt, between'],
            ['Date', 'on, before, after, between, within'],
            ['Boolean', 'is-true, is-false'],
            ['Any', 'is-set, is-not-set']
          ]}
        />
        <p className='max-w-prose text-subtle'>
          Empty is a real state: null, an empty string and an empty list are all
          not set. Negative operators (is-not, not-contains, neq) keep records
          where the field is empty, the way Meilisearch does. Check a view from
          storage or an API with <Code>validateRecordView(view, fields)</Code>.
          It rejects unknown fields and operators that do not fit, and says what
          would.
        </p>
      </Section>

      <Section title='Scope'>
        <p className='max-w-prose text-subtle'>
          Scope is the part of a query the page sets, such as &quot;products
          offered on Neon Nights, any of its days, or its collection&quot;. It
          is a filter list your app resolves, because it can span levels a flat
          record cannot express. Scope is never saved in a view and Clear never
          removes it. Apply it next to the view&apos;s own query when you fetch.
        </p>
      </Section>

      <Section title='Dates'>
        <p className='max-w-prose text-subtle'>
          Date filters follow the same moment kinds as{' '}
          <Link href='/foundations/date-and-time'>
            date and time formatting
          </Link>
          . Calendar words resolve in the viewer&apos;s zone, so
          &quot;today&quot; is today&apos;s date at every venue. An event at
          11:30pm in Perth is still a Saturday gig when it is already Sunday in
          Sydney.
        </p>
        <Table
          head={['moment', 'Example', 'Filters compare']}
          rows={[
            [
              'event',
              'Session start, doors',
              'Venue-local calendar date, never converted'
            ],
            ['access', 'On sale, presale', 'Venue-local date'],
            ['timestamp', 'Order placed', "The viewer's day, as instants"],
            ['date', 'Birthday, all-day on-sale', 'A plain date with no zone']
          ]}
        />
        <p className='max-w-prose text-subtle'>
          Relative ranges have one fixed meaning: a week is Monday to Sunday, a
          weekend is Saturday and Sunday, rolling windows count today, and the
          financial year starts in July. Hour windows and the open ranges
          upcoming, past and ongoing compare the instant, except on a plain
          date, where upcoming starts today and past ends yesterday. A range
          field matches when any part of it overlaps, so a five-night festival
          is on this weekend if one night is.
        </p>
      </Section>

      <Section title='Browser and server'>
        <p className='max-w-prose text-subtle'>
          <Code>resolveRecordQuery(query, fields, {'{ now, timeZone }'})</Code>{' '}
          fixes relative dates at a moment. In the browser,{' '}
          <Code>matchesRecordQuery(row, resolved, fields)</Code> keeps or drops
          each row. On a server,{' '}
          <Code>toMeilisearch(view, fields, {'{ now, timeZone }'})</Code> from{' '}
          <Code>@oztix/roadie-core/records/meilisearch</Code> returns the same
          meaning as Meilisearch parameters. It sits on its own subpath so the
          model stays backend-agnostic.
        </p>
        <CodePreview>{`toMeilisearch(view, eventFields, {
  now: new Date('2026-10-02T13:30:00Z'), // 11:30pm Friday in Melbourne
  timeZone: 'Australia/Melbourne'
})
// ${JSON.stringify(meilisearch, null, 2).split('\n').join('\n// ')}`}</CodePreview>
        <p className='max-w-prose text-subtle'>
          It needs Meilisearch 1.15 or later, which compares date strings. The
          index stores instants as epoch seconds (pass{' '}
          <Code>epoch: &apos;milliseconds&apos;</Code> otherwise), event and
          access dates under <Code>localDateKey</Code>, and a range&apos;s end
          on every record. Text <Code>contains</Code> needs Meilisearch&apos;s{' '}
          <Code>containsFilter</Code> feature, and the index&apos;s{' '}
          <Code>searchableAttributes</Code> should list the fields marked{' '}
          <Code>searchable</Code>. Scope facet value search to the user&apos;s
          permissions on the server.
        </p>
      </Section>

      <Section title='Typed text'>
        <p className='max-w-prose text-subtle'>
          <Code>parseQuery(text, {'{ fields, now, timeZone }'})</Code> reads
          typed text into ranked suggestions, shaped for <Code>QueryField</Code>
          . It knows nothing about any one entity: to search events and orders
          together, call it once per entity with its <Code>entity</Code> and
          merge the results by <Code>score</Code>. It reads identifiers,{' '}
          <Code>field:value</Code>, field names, option and status values, and
          date phrases. Each part of the text gets its best reading first, with
          the rest kept as <Code>remainder</Code>. A phrase always becomes a
          visible, editable chip, never hidden logic.
        </p>
        <CodePreview>{`parseQuery('melb this weekend', { fields: eventFields, now, timeZone })
// ${JSON.stringify(suggestions, null, 2).split('\n').join('\n// ')}`}</CodePreview>
      </Section>

      <Section title='URL format'>
        <p className='max-w-prose text-subtle'>
          <Code>toSearchParams(view, position)</Code> writes a view as search
          params, so a list screen opens from a link with the view applied. The
          format is versioned and a public contract: the same view always writes
          the same URL. <Code>fromSearchParams(params, fields)</Code> reads it
          back, ignores keys it does not know, and returns your fallback view
          with its problems when the URL holds something invalid.
        </p>
        <Table
          head={['Key', 'Holds']}
          rows={[
            [<Code key='k'>v</Code>, 'The format version, 1'],
            [
              <>
                <Code key='k'>view</Code>, <Code key='e'>entity</Code>
              </>,
              'The saved view it started from, and the entity. A URL view has no name'
            ],
            [<Code key='k'>q</Code>, 'The search text'],
            [
              <Code key='k'>f</Code>,
              <>
                One per chip, in order, as <Code>field:operator:value</Code>.
                Lists are comma separated
              </>
            ],
            [
              <Code key='k'>sort</Code>,
              <>
                Fields in order, descending with a leading dash:{' '}
                <Code>-starts,name</Code>
              </>
            ],
            [
              <>
                <Code key='k'>layout</Code>, <Code key='c'>columns</Code>,{' '}
                <Code key='h'>hidden</Code>, <Code key='f'>fields</Code>
              </>,
              'The layout and its settings'
            ],
            [
              <>
                <Code key='k'>page</Code>, <Code key='s'>size</Code>,{' '}
                <Code key='r'>row</Code>
              </>,
              'Where the reader is. The URL counts pages from 1; position.page counts from 0'
            ]
          ]}
        />
        <CodePreview>
          {params.map(([key, value]) => `${key}=${value}`).join('\n')}
        </CodePreview>
      </Section>

      <Section title='Modified views'>
        <p className='max-w-prose text-subtle'>
          <Code>equalViews(view, baseline)</Code> tells whether a view still
          matches the one it was opened from, for the modified mark beside a
          view name. It ignores id, name, spacing in the search and the order of
          chips and their values. Sort and column order still count.
        </p>
      </Section>

      <Section title='Guidelines'>
        <Guideline
          title='Describe per-row facts as keys'
          description='A function cannot travel to a server, a URL or a search index.'
        >
          <Guideline.Do
            code={`{ key: 'starts', type: 'date', moment: 'event', timeZoneKey: 'venueZone' }`}
          >
            Name the key that holds the venue&apos;s zone.
          </Guideline.Do>
          <Guideline.Dont
            code={`{ key: 'starts', type: 'date', zone: (row) => row.venue.zone }`}
          >
            Work it out in a callback only the browser can run.
          </Guideline.Dont>
        </Guideline>
        <Guideline
          title='Keep session state out of views'
          description='A saved view should open the same for everyone, at the top.'
        >
          <Guideline.Do code={`toSearchParams(view, { page: 2, row: 40 })`}>
            Pass the page and row as position, next to the view.
          </Guideline.Do>
          <Guideline.Dont
            code={`saveView({ ...view, page: 2, selected: ['ord_123'] })`}
          >
            Save where one person had scrolled to as part of the view.
          </Guideline.Dont>
        </Guideline>
      </Section>
    </div>
  )
}
