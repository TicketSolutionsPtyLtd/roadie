import type { ReactNode } from 'react'

import Link from 'next/link'

import { CodePreview } from '@/components/CodePreview'
import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components/code'

import { OZTIX_RECORDS, type OztixRecord } from './records'

export const metadata = {
  title: 'Tables',
  description:
    'Which table fits the job, and how common Oztix records look in a pane, on a phone, in a dashboard, on a detail page and in a PDF.',
  category: 'Building apps',
  alsoIn: [{ route: '/charts', category: 'Guidelines' }]
}

const CHOICES: ReactNode[][] = [
  [
    <Link key='record' href='/components/record-table' className='underline'>
      RecordTable
    </Link>,
    'A working list people search, sort, select and page through. Turns into list rows or cards when narrow.',
    'A Pane, most of the time',
    'Any number'
  ],
  [
    <Link key='data' href='/charts/data-table' className='underline'>
      DataTable
    </Link>,
    'A read-only summary. Renders on the server, so it also prints in reports, PDFs and slides.',
    'A DataCard on a dashboard, a detail page, a PDF',
    'About 25 or fewer'
  ],
  [
    <Link key='list' href='/components/list' className='underline'>
      List
    </Link>,
    'A few records to open, or settings. No columns to compare.',
    'A detail page, a menu pane, settings',
    'About 10 or fewer'
  ],
  [
    <Link key='card' href='/components/card' className='underline'>
      Card grid
    </Link>,
    'Browsing where an image leads, like event tiles. No sorting.',
    'A home or discovery page',
    'A screen or two'
  ],
  [
    <Link key='stat' href='/charts/stat-tile' className='underline'>
      StatTile
    </Link>,
    'One number that matters, with its change.',
    'A dashboard row, the top of a detail page',
    'One value'
  ]
]

const WRONG_CHOICE: ReactNode[] = [
  <>
    A DataTable gains a search box or a pager. It has become a working list. Use
    a RecordTable.
  </>,
  <>
    A RecordTable holds five rows nobody searches. Use a DataTable, or a List
    when each row opens something.
  </>,
  <>
    A card grid gets sort controls. People are comparing, not browsing. Use a
    RecordTable.
  </>,
  <>
    A dashboard card lists people or orders. Show the count in a StatTile and
    link to the pane that lists them.
  </>,
  <>A table has one row. Show the values as a StatTile or a description list.</>
]

const COLUMN_RULES: ReactNode[] = [
  <>
    <span className='text-strong'>Describe the record once.</span> Build its
    fields with <Code>recordFields</Code>, then build columns from them with{' '}
    <Code>tableColumns</Code>. A field&apos;s type decides how its values read,
    everywhere it shows. See{' '}
    <Link href='/foundations/records' className='underline'>
      Records model
    </Link>
    .
  </>,
  <>
    <span className='text-strong'>One title column.</span> Pin it with{' '}
    <Code>pin: true</Code>. The first pinned text column, or else the first text
    column, reads as the row&apos;s title, in strong text.
  </>,
  <>
    <span className='text-strong'>Numbers end-aligned.</span> Number and money
    fields do this, and sort largest first.
  </>,
  <>
    <span className='text-strong'>Money.</span> <Code>currency</Code> where
    cents matter, an order total or a payout. <Code>compactCurrency</Code> for
    gross across events, where $118k reads faster than $118,400. A field with{' '}
    <Code>currencyKey</Code> names any currency that isn&apos;t dollars.
  </>,
  <>
    <span className='text-strong'>Dates.</span> Event and access dates read in
    the venue&apos;s zone through <Code>timeZoneKey</Code>, long with the
    weekday. Timestamps read in the reader&apos;s zone, medium with the time.
    See{' '}
    <Link href='/foundations/date-and-time' className='underline'>
      Date and time
    </Link>
    .
  </>,
  <>
    <span className='text-strong'>Status as a Badge.</span> Give an option field
    a <Code>status</Code> map of each key to its intent, chosen by meaning. It
    shows a small Badge in normal emphasis and sorts by each key&apos;s{' '}
    <Code>order</Code>.
  </>,
  <>
    <span className='text-strong'>Ids in monospace.</span> Order numbers,
    references and promo codes, through <Code>font-mono</Code> in the
    column&apos;s <Code>cell</Code>.
  </>,
  <>
    <span className='text-strong'>Give each column its place on a phone.</span>{' '}
    Under 40rem the table lists its records. The title column takes{' '}
    <Code>narrow: &apos;title&apos;</Code>, one line under it{' '}
    <Code>&apos;description&apos;</Code>, a status{' '}
    <Code>&apos;trailing&apos;</Code>. Any <Code>&apos;detail&apos;</Code>{' '}
    column turns rows into cards; keep it to three or four details. The rest
    stay in the wide table.
  </>,
  <>
    <span className='text-strong'>Let the extras go first.</span> Give columns
    people can do without a <Code>priority</Code> so they hide as the table
    narrows, 3 first, before it turns into list rows.
  </>,
  <>
    <span className='text-strong'>Images lead.</span> An image column, with{' '}
    <Code>kind: &apos;image&apos;</Code>, shows a thumbnail, leads a list row
    and becomes a card&apos;s banner.
  </>,
  <>
    <span className='text-strong'>Hide the rest.</span> A view&apos;s{' '}
    <Code>layout.columns.hidden</Code> hides columns, and its <Code>order</Code>{' '}
    reorders them. Pinned columns stay first and shown.
  </>
]

const ORDERS_EXAMPLE = `const customers = ['Mia Tran', 'Jack Ellis', 'Ava Nguyen', 'Noah Smith', 'Isla Brown', 'Leo Wilson']
const eventNames = ['Paper Lanterns', 'Marzipan Thunderclap', 'Corduroy Lagoon Sessions', 'Echo Garden']
const statuses = ['paid', 'paid', 'paid', 'pending', 'refunded']
const orders = Array.from({ length: 60 }, (_, index) => ({
  id: \`order-\${index}\`,
  number: \`OZ-\${48210 + index * 7}\`,
  customer: customers[index % customers.length],
  event: eventNames[index % eventNames.length],
  status: statuses[index % statuses.length],
  placedAt: new Date(Date.UTC(2026, 9, 1, 0, 15) + index * 5 * 3600000).toISOString(),
  total: [79.9, 149, 59, 238.5][index % 4]
}))

const field = recordFields()
const fields = [
  field.text('number', { label: 'Order' }),
  field.text('customer', { label: 'Customer' }),
  field.text('event', { label: 'Event' }),
  field.option('status', {
    label: 'Status',
    status: { paid: { intent: 'success' }, pending: { intent: 'warning' }, refunded: { intent: 'neutral' } }
  }),
  field.date('placedAt', { label: 'Placed', moment: 'timestamp' }),
  field.money('total', { label: 'Total', format: 'currency' })
]

const column = tableColumns(fields)
const columns = [
  column.field('number', {
    pin: true,
    width: { min: 7 },
    cell: ({ row }) => <span className='font-mono font-semibold text-strong'>{row.number}</span>
  }),
  column.field('customer'),
  column.field('event'),
  column.field('status'),
  column.field('placedAt'),
  column.field('total')
]

render(
  <RecordTable
    caption='Orders'
    data={orders}
    fields={fields}
    columns={columns}
    getRowId={(row) => row.id}
    recordName={{ one: 'order', other: 'orders' }}
    defaultView={{ query: { sort: [{ field: 'placedAt', direction: 'descending' }] } }}
    maxHeight='28rem'
  />
)`

const TOP_EVENTS_EXAMPLE = `<div className='w-full max-w-md'>
  <DataCard
    label='Top events'
    takeaway='Paper Lanterns leads gross this month'
    source='Oztix sales. Gross before fees.'
  >
    <DataTable
      caption='Top events by gross'
      columns={[
        { key: 'event', header: 'Event', kind: 'text', pin: true, secondaryKey: 'venue' },
        { key: 'sellThrough', header: 'Sell-through', kind: 'meter', target: 0.85 },
        { key: 'gross', header: 'Gross', kind: 'number', format: 'compactCurrency' }
      ]}
      rows={[
        { event: 'Paper Lanterns', venue: 'Kazoo Hollow Room, Brisbane', sellThrough: 0.94, gross: 212400 },
        { event: 'Marzipan Thunderclap', venue: 'The Quilted Walrus Room, Melbourne', sellThrough: 0.81, gross: 168900 },
        { event: 'Corduroy Lagoon Sessions', venue: 'Drongo Bell Social Club, Adelaide', sellThrough: 0.66, gross: 97300 },
        { event: 'Echo Garden', venue: 'Antler Kettle Hall, Hobart', sellThrough: 0.58, gross: 61200 },
        { event: 'Midnight Frequency', venue: 'Kazoo Hollow Room, Brisbane', sellThrough: 0.37, gross: 28800 }
      ]}
    />
  </DataCard>
</div>`

function RefTable({
  label,
  head,
  rows,
  minWidth = 'min-w-2xl'
}: {
  label: string
  head: string[]
  rows: ReactNode[][]
  minWidth?: string
}) {
  return (
    <div
      role='region'
      aria-label={label}
      tabIndex={0}
      className='overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2'
    >
      <table className={`w-full text-sm ${minWidth}`}>
        <thead>
          <tr className='border-b border-subtle text-left text-subtle'>
            {head.map((h) => (
              <th key={h} className='py-2 pr-4 font-medium'>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className='border-b border-subtler align-top'>
              {cells.map((c, j) => (
                <td
                  key={j}
                  className={
                    j === 0 ? 'py-2 pr-4 text-strong' : 'py-2 pr-4 text-subtle'
                  }
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className='grid max-w-prose list-disc gap-2 pl-5 text-subtle'>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function Example({
  title,
  description,
  children
}: {
  title: string
  description: ReactNode
  children: ReactNode
}) {
  return (
    <div className='grid gap-2'>
      <h3 className='text-display-ui-5 text-strong'>{title}</h3>
      <p className='max-w-prose text-sm text-subtle'>{description}</p>
      {children}
    </div>
  )
}

function RecordBlock({ record }: { record: OztixRecord }) {
  const contexts: [string, ReactNode][] = [
    [
      'In a Pane',
      <>
        {record.pane}
        {record.example && (
          <>
            {' '}
            See the{' '}
            <Link
              href={`/components/record-table#${record.example.anchor}`}
              className='underline'
            >
              {record.example.label}
            </Link>{' '}
            example.
          </>
        )}
      </>
    ],
    ['On a phone', record.phone],
    ['Dashboard', record.dashboard],
    ['Detail page', record.detail],
    ['PDF or report', record.print]
  ]
  return (
    <div className='grid gap-4 border-t border-subtle pt-6'>
      <div className='grid gap-1'>
        <h3 className='text-display-ui-4 text-strong'>{record.name}</h3>
        <p className='max-w-prose text-subtle'>{record.what}</p>
      </div>
      <RefTable
        label={`${record.name} columns`}
        head={['Column', 'Field type', 'Shows as', 'narrow', 'priority']}
        minWidth='min-w-2xl'
        rows={record.columns.map((column) => [
          column.pin ? `${column.label} (pinned)` : column.label,
          <Code key='type'>{column.type}</Code>,
          column.shows,
          column.narrow ? <Code key='narrow'>{column.narrow}</Code> : '',
          column.priority ?? ''
        ])}
      />
      <dl className='grid max-w-prose gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_1fr]'>
        {contexts.map(([term, text]) => (
          <div key={term} className='contents'>
            <dt className='font-semibold text-strong'>{term}</dt>
            <dd className='text-subtle'>{text}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function TablesPage() {
  return (
    <div className='grid gap-12'>
      <p className='text-lg text-subtle'>
        Roadie has one table for working through records and one for reading a
        summary. Pick by what people do with the rows, then shape the columns so
        the same record reads the same way in a pane, in a dashboard and on
        paper.
      </p>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Choose by job</h2>
        <RefTable
          label='Tables by job'
          head={['Component', 'Use it for', 'Where it lives', 'Rows']}
          rows={CHOICES}
        />
        <h3 className='text-display-ui-5 text-strong'>
          Signs you picked the wrong one
        </h3>
        <Bullets items={WRONG_CHOICE} />
        <Guideline
          headingLevel={3}
          title='Work in a RecordTable, read in a DataTable'
        >
          <Guideline.Do
            code={`<RecordTable
  caption='Orders'
  data={orders}
  fields={fields}
  columns={columns}
/>`}
          >
            Give people a RecordTable when they search, sort or page through the
            rows.
          </Guideline.Do>
          <Guideline.Dont
            code={`<DataTable
  caption='Orders'
  columns={columns}
  rows={allOrders} // 4,812 rows
/>`}
          >
            Put a long list people need to search into a DataTable. It renders
            every row and has no search or paging.
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Records live in a Pane
        </h2>
        <p className='max-w-prose text-subtle'>
          Most RecordTables fill a{' '}
          <Link href='/components/pane' className='underline'>
            Pane
          </Link>
          : the title in the header, the toolbar with its search above the rows
          in the body, the pager in the footer. Keep the search in the
          table&apos;s toolbar, not in <Code>Pane.Search</Code>. The RecordTable
          page has a{' '}
          <Link href='/components/record-table#in-a-pane' className='underline'>
            complete pane
          </Link>{' '}
          to copy.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Examples</h2>
        <Example
          title='Orders'
          description='A working list in its own box, newest first. The order number is the pinned title, in monospace through its cell, and the status reads as a Badge.'
        >
          <CodePreview language='tsx-live-noinline' expandable>
            {ORDERS_EXAMPLE}
          </CodePreview>
        </Example>
        <Example
          title='Top events in a dashboard'
          description='A DataTable in a DataCard. Five rows, sorted by gross, with the venue as secondary text and sell-through as a meter.'
        >
          <CodePreview language='tsx-live'>{TOP_EVENTS_EXAMPLE}</CodePreview>
        </Example>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Columns</h2>
        <Bullets items={COLUMN_RULES} />
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Oztix records by context
        </h2>
        <p className='max-w-prose text-subtle'>
          Each record lists its RecordTable columns with the type of the field
          behind each one, how it reads, where it goes on a phone and which hide
          first as the table narrows, then how the record appears everywhere
          else.
        </p>
        <div className='grid gap-10'>
          {OZTIX_RECORDS.map((record) => (
            <RecordBlock key={record.name} record={record} />
          ))}
        </div>
      </section>
    </div>
  )
}
