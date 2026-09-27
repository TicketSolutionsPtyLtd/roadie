import type { ReactNode } from 'react'

import Link from 'next/link'

import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  PencilSimpleIcon
} from '@phosphor-icons/react/ssr'

import { CodePreview } from '@/components/CodePreview'
import { Guideline } from '@/components/Guideline'
import { CardMenu } from '@/components/charts/CardMenu'

import { Chart } from '@oztix/roadie-charts/chart'
import { ChartLegend } from '@oztix/roadie-charts/chart-legend'
import { DashboardView } from '@oztix/roadie-charts/dashboard-view'
import { createShowDashboard } from '@oztix/roadie-charts/examples'
import { LineChart } from '@oztix/roadie-charts/line-chart'
import { lineChartTable } from '@oztix/roadie-charts/tables'
import { Button, IconButton } from '@oztix/roadie-components/button'
import { Code } from '@oztix/roadie-components/code'
import { DataCard } from '@oztix/roadie-components/data-card'
import {
  DataTable,
  type DataTableColumn
} from '@oztix/roadie-components/data-table'
import { Sparkline } from '@oztix/roadie-components/sparkline'
import { StatTile } from '@oztix/roadie-components/stat-tile'
import {
  ACTIONS_LABEL_LIMITS,
  CARD_SIZES,
  CARD_SPANS,
  CHART_LABEL_LIMITS,
  COPY_LIMITS,
  type CardSize,
  type CardState,
  DASHBOARD_TRACKS,
  DASHBOARD_WIDTHS,
  type DashboardWidth
} from '@oztix/roadie-core/dashboard-layout'

import { PACE_EXAMPLE } from '../pace-example'
import { TICKETING_REFERENCE } from '../ticketing-reference'

export const metadata = {
  title: 'Dashboard design',
  description:
    'Put cards together into dashboards that read the same everywhere',
  category: 'Guidelines',
  order: 2
}

const SIZE_USE: Record<CardSize, string> = {
  stat: 'Stat tiles',
  sm: 'Ranked list, small chart',
  md: 'Chart, table',
  lg: 'Main chart',
  full: 'Heatmap, wide table'
}

const WIDTH_NAME: Record<DashboardWidth, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  phone: 'Phone'
}

const SIZE_ROWS = CARD_SIZES.map((size) => [
  <Code key='size'>{size}</Code>,
  ...DASHBOARD_WIDTHS.map((width) => String(CARD_SPANS[size][width])),
  SIZE_USE[size]
])

const SIZE_HEAD = [
  'Size',
  ...DASHBOARD_WIDTHS.map(
    (width) => `${WIDTH_NAME[width]} (of ${DASHBOARD_TRACKS[width]})`
  ),
  'Use'
]

const LIMIT_SIZES: CardSize[] = ['stat', 'md']

const LIMIT_ROWS = LIMIT_SIZES.map((size) => [
  <Code key='size'>{size}</Code>,
  `${COPY_LIMITS[size].label} characters`,
  `${COPY_LIMITS[size].context} characters`
])

const CHART_LABEL_SIZES: (keyof typeof CHART_LABEL_LIMITS)[] = [
  'sm',
  'md',
  'lg',
  'full'
]

const CHART_LABEL_ROWS = CHART_LABEL_SIZES.map((size) => [
  <Code key='size'>{size}</Code>,
  `${CHART_LABEL_LIMITS[size]} characters`
])

const QUESTIONS = [
  ['How much, right now', 'Stat tile', 'Tickets sold'],
  [
    'Is it on track',
    'Stat tile with a reference line',
    'Sell-through against 85%'
  ],
  ['Which ones need attention', 'Data table with sparklines', 'Upcoming shows'],
  ['What should I do', 'Note card', 'What to do next'],
  ...TICKETING_REFERENCE.map((row) => [
    row.question.replace(/\?$/, ''),
    row.chart.startsWith('Annotations')
      ? 'Annotations on a time chart'
      : `Chart card showing ${row.chart}`,
    row.term
  ])
]

const FILLING_ROWS: { name: ReactNode; sizes: CardSize[] }[] = [
  {
    name: (
      <>
        Four <Code>stat</Code>
      </>
    ),
    sizes: ['stat', 'stat', 'stat', 'stat']
  },
  {
    name: (
      <>
        Two <Code>md</Code>
      </>
    ),
    sizes: ['md', 'md']
  },
  {
    name: (
      <>
        One <Code>full</Code>
      </>
    ),
    sizes: ['full']
  },
  {
    name: (
      <>
        Six <Code>sm</Code>
      </>
    ),
    sizes: ['sm', 'sm', 'sm', 'sm', 'sm', 'sm']
  },
  {
    name: (
      <>
        Mirrored <Code>lg</Code> + <Code>sm</Code>
      </>
    ),
    sizes: ['lg', 'sm', 'sm', 'lg']
  }
]

const SPAN_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12'
}

const TRACK_CLASS: Record<DashboardWidth, string> = {
  desktop: 'grid-cols-12',
  tablet: 'grid-cols-6',
  phone: 'grid-cols-2'
}

type Slot = { size: CardSize; span: number } | { gap: number }

function packRows(sizes: CardSize[], width: DashboardWidth) {
  const tracks = DASHBOARD_TRACKS[width]
  const slots: Slot[] = []
  let used = 0
  for (const size of sizes) {
    const span = CARD_SPANS[size][width]
    if (used + span > tracks) {
      slots.push({ gap: tracks - used })
      used = 0
    }
    slots.push({ size, span })
    used = (used + span) % tracks
  }
  if (used > 0) slots.push({ gap: tracks - used })
  return slots
}

function WidthDiagram({
  sizes,
  width,
  labelled = false
}: {
  sizes: CardSize[]
  width: DashboardWidth
  labelled?: boolean
}) {
  return (
    <div
      className={`grid ${labelled ? 'gap-1' : 'gap-0.5'} ${TRACK_CLASS[width]}`}
    >
      {packRows(sizes, width).map((slot, i) =>
        'gap' in slot ? (
          <div
            key={i}
            className={`${SPAN_CLASS[slot.gap]} grid h-6 place-content-center rounded-sm border border-dashed border-normal text-xs text-subtle intent-danger`}
          >
            {labelled && 'Gap'}
          </div>
        ) : (
          <div
            key={i}
            className={`${SPAN_CLASS[slot.span]} grid h-6 place-content-center rounded-sm emphasis-subtle font-mono text-xs`}
          >
            {labelled && slot.size}
          </div>
        )
      )}
    </div>
  )
}

function RowDiagram({
  sizes,
  wide = false
}: {
  sizes: CardSize[]
  wide?: boolean
}) {
  return (
    <div className={`grid max-w-full gap-3 ${wide ? 'w-full' : 'w-56'}`}>
      {DASHBOARD_WIDTHS.map((width) => (
        <div key={width} className='grid gap-1'>
          <p className='text-xs text-subtle'>{WIDTH_NAME[width]}</p>
          <WidthDiagram sizes={sizes} width={width} labelled />
        </div>
      ))}
    </div>
  )
}

const FILLING_TABLE_ROWS = FILLING_ROWS.map(({ name, sizes }) => [
  name,
  ...DASHBOARD_WIDTHS.map((width) => (
    <div key={width} className='min-w-14'>
      <WidthDiagram sizes={sizes} width={width} />
    </div>
  ))
])

const ANATOMY = [
  ['Label', 'Required. Fixed and short.', 'Pace to date'],
  [
    'Headline',
    'A value with a short delta, or a takeaway sentence. Never both.',
    '61% ↑ 16 pts'
  ],
  [
    'Context line',
    'Optional. What the delta is compared with.',
    'Forecast 96% by show day'
  ],
  [
    'Actions',
    'Top right. The Chart and Table switch, and an optional menu.',
    'Chart, Table'
  ],
  ['Body', 'A sparkline, plot, table, note text or nothing.', 'A LineChart'],
  [
    'Footer',
    'The source, under a hairline. Required on chart and table cards.',
    'Oztix sales. 38 similar shows.'
  ]
]

const STATES: { state: CardState; when: string }[] = [
  { state: 'ready', when: 'The data arrived. This is the default.' },
  {
    state: 'loading',
    when: 'The app is fetching. The label shows straight away and skeletons hold the shape, so nothing jumps when the data lands.'
  },
  {
    state: 'empty',
    when: 'There is nothing to count yet. Say so in one line. Never draw a chart full of zeros.'
  },
  {
    state: 'error',
    when: 'The request failed. The card says so in plain words and the app passes a Retry action.'
  },
  {
    state: 'stale',
    when: 'The app decides when data is stale and passes the time to show in the footer.'
  }
]

const SOLD_TREND = [40, 62, 70, 88, 95, 120, 131, 160, 172, 190]

const PORTFOLIO_COLUMNS: DataTableColumn[] = [
  {
    key: 'show',
    header: 'Show',
    kind: 'text',
    pin: true,
    secondaryKey: 'venue'
  },
  {
    key: 'daily',
    header: 'Daily sales, 30 days',
    kind: 'sparkline',
    priority: 3
  },
  {
    key: 'sellThrough',
    header: 'Sell-through',
    kind: 'meter',
    target: 0.85,
    priority: 2
  },
  {
    key: 'pace',
    header: 'Pace index',
    kind: 'delta',
    format: 'index',
    baseline: 100
  },
  {
    key: 'gross',
    header: 'Gross',
    kind: 'number',
    format: 'compactCurrency',
    priority: 1
  }
]

const PORTFOLIO_ROWS = [
  {
    show: 'Ball Park Music',
    venue: 'The Lantern Room, Fortitude Valley',
    daily: [22, 30, 41, 52, 61, 72, 81, 96, 112, 131, 152, 160],
    sellThrough: 0.61,
    pace: 112,
    gross: 118400
  },
  {
    show: 'Ocean Alley',
    venue: 'Parkside Amphitheatre, Geelong',
    daily: [90, 95, 102, 94, 108, 97, 104, 110, 101, 106, 110, 112],
    sellThrough: 0.51,
    pace: 101,
    gross: 183000
  },
  {
    show: 'Julia Jacklin',
    venue: 'The Gasworks Room, Hobart',
    daily: [18, 16, 15, 14, 12, 11, 10, 9, 8, 7, 6, 6],
    sellThrough: 0.4,
    pace: 78,
    gross: 22900
  }
]

const STAT_CARD_JSON = `{
  "id": "sold", "kind": "stat", "size": "stat",
  "label": "Tickets sold", "value": 1464,
  "delta": { "value": 216 }, "context": "This week, of 2,400"
}`

const SHOW_DASHBOARD_SIZES: CardSize[] = [
  'full',
  'stat',
  'stat',
  'stat',
  'stat',
  'full',
  'md',
  'md',
  'md',
  'md',
  'full'
]

const DASHBOARD_JSX = `<Dashboard>
  <Dashboard.Section title='At a glance'>
    <DataCard size='full' label='What to do next'>
      <p>GA is carrying the show and VIP is 45 points short of target. Push VIP in the final month.</p>
    </DataCard>
    <StatTile label='Tickets sold' value={1464} delta={{ value: 216 }} />
    <StatTile label='Sell-through' value={0.61} format='percent' />
    <StatTile label='Pace index' value={112} format='index' />
    <StatTile label='Gross revenue' value={118400} format='compactCurrency' />
  </Dashboard.Section>
  <Dashboard.Section title='Sales'>
    <Chart size='full' label='Sales pace' source='Oztix sales.'>
      <LineChart data={pace} x='day' y='sold' format='percent' />
    </Chart>
    <DataCard size='md' label='Ticket types'>
      <DataTable columns={typeColumns} rows={types} />
    </DataCard>
    <DataCard size='md' label='Where buyers are from'>
      <DataTable columns={suburbColumns} rows={suburbs} />
    </DataCard>
  </Dashboard.Section>
  <Dashboard.Section title='Buyers'>
    <Chart size='md' label='Daily orders' takeaway='Orders peak on Fridays and grow each week'>
      <BarChart data={dailyOrders} x='day' y='orders' />
    </Chart>
    <Chart size='md' label='Ticket type mix' takeaway='GA is carrying the show'>
      <StackedBars data={salesByMonth} x='month' y='sold' series='type' />
    </Chart>
    <Chart size='full' label='When fans buy' takeaway='Fans buy most on Friday evenings'>
      <Heatmap data={ordersByHour} rows='weekday' columns='hour' value='orders' />
    </Chart>
  </Dashboard.Section>
</Dashboard>`

const VALIDATE_CODE = `import { validateDashboard } from '@oztix/roadie-core/dashboard'

const { problems } = validateDashboard(spec)`

const VALIDATE_PROBLEMS = [
  [
    'sections[1]',
    'Row 1 leaves 4 empty columns on desktop after pace',
    'warning'
  ],
  [
    'sections[1]',
    'Row 2 leaves 6 empty columns on desktop after channels',
    'warning'
  ],
  [
    'sections[1]',
    'Row 2 leaves 3 empty columns on tablet after channels',
    'warning'
  ]
]

const MENU_GROUPS = [
  ['Chart', 'View, Edit, Rename, Duplicate, Alerts'],
  ['Display', 'Hide description, and the view options'],
  [
    'Export',
    'Download CSV, Copy as image, and Refresh data with “Last updated 4 hours ago” as helper text'
  ],
  [
    'Dashboard',
    'Move to, Copy to, then Remove from dashboard last, in the danger intent'
  ]
]

const CARD_ACTIONS_CODE = `// CardMenu.tsx
'use client'

import {
  ArrowRightIcon,
  CopyIcon,
  DownloadIcon,
  EyeSlashIcon,
  ImageIcon,
  PencilSimpleIcon,
  TrashIcon
} from '@phosphor-icons/react'

import type { ChartTable } from '@oztix/roadie-charts/tables'
import { DataCard } from '@oztix/roadie-components/data-card'
import { Menu } from '@oztix/roadie-components/menu'

function csvField(value: unknown) {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '')
  return /[",\\r\\n]/.test(text) ? \`"\${text.replaceAll('"', '""')}"\` : text
}

function tableCsv({ columns, rows }: ChartTable) {
  const lines = [
    columns.map((column) => csvField(column.header)),
    ...rows.map((row) => columns.map((column) => csvField(row[column.key])))
  ]
  return lines.map((line) => line.join(',')).join('\\n')
}

function downloadCsv(label: string, table: ChartTable) {
  const url = URL.createObjectURL(
    new Blob([tableCsv(table)], { type: 'text/csv' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = \`\${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv\`
  link.click()
  // Revoking in the same task can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url))
}

export function CardMenu({ label, table }: { label: string; table?: ChartTable }) {
  return (
    <Menu>
      <Menu.Trigger render={<DataCard.MoreButton label={label} />} />
      <Menu.Content align='end'>
        <Menu.Group>
          <Menu.GroupLabel>Chart</Menu.GroupLabel>
          <Menu.Item icon={<PencilSimpleIcon weight='bold' />}>Edit</Menu.Item>
          <Menu.Item icon={<CopyIcon weight='bold' />}>Duplicate</Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Display</Menu.GroupLabel>
          <Menu.Item icon={<EyeSlashIcon weight='bold' />}>Hide description</Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Export</Menu.GroupLabel>
          {table && (
            <Menu.Item
              icon={<DownloadIcon weight='bold' />}
              onClick={() => downloadCsv(label, table)}
            >
              Download CSV
            </Menu.Item>
          )}
          <Menu.Item icon={<ImageIcon weight='bold' />}>Copy as image</Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Dashboard</Menu.GroupLabel>
          <Menu.Item icon={<ArrowRightIcon weight='bold' />}>Move to</Menu.Item>
          <Menu.Item intent='danger' icon={<TrashIcon weight='bold' />}>
            Remove from dashboard
          </Menu.Item>
        </Menu.Group>
      </Menu.Content>
    </Menu>
  )
}

// page.tsx
import { cardTable } from '@oztix/roadie-charts/tables'

<DashboardView
  spec={spec}
  cardActions={(card) => (
    <CardMenu label={card.label} table={cardTable(card)} />
  )}
/>`

const HOVER_ONLY_CODE = `<DataCard
  label='Ticket types'
  actions={
    <DataCard.MoreButton
      label='Ticket types'
      className='opacity-0 group-hover/card:opacity-100'
    />
  }
/>`

const GAP_WARNING =
  '[Roadie Dashboard] "Pace" has rows that don\'t fill: desktop row 1 leaves 4 empty; desktop row 2 leaves 6 empty; tablet row 2 leaves 3 empty. See /charts/dashboards.'

function Table({
  label,
  head,
  rows,
  fit = false
}: {
  label: string
  head: string[]
  rows: ReactNode[][]
  fit?: boolean
}) {
  return (
    <div
      role='region'
      aria-label={label}
      tabIndex={0}
      className='overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2'
    >
      <table className={fit ? 'w-full text-sm' : 'w-full min-w-xl text-sm'}>
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

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className='grid max-w-prose list-disc gap-2 pl-5 text-subtle'>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function Stage({ children }: { children: ReactNode }) {
  return (
    <div className='grid sm:rounded-xl sm:border sm:border-subtler sm:p-6'>
      {children}
    </div>
  )
}

function Tile({ children }: { children: ReactNode }) {
  return <div className='grid w-64 max-w-full'>{children}</div>
}

function StateCard({ state }: { state: CardState }) {
  return (
    <DataCard
      label='Tickets sold'
      value={1842}
      delta={{ value: 214 }}
      context='This week, of 2,400'
      source='Oztix sales.'
      state={state}
      bodyHeight='2rem'
      emptyMessage='No sales yet. Tickets go on sale Fri 27 Nov.'
      errorAction={
        <Button size='sm' emphasis='normal'>
          Retry
        </Button>
      }
      staleLabel='As of 10:42am'
    >
      <Sparkline values={SOLD_TREND} />
    </DataCard>
  )
}

export default function DashboardsPage() {
  return (
    <div className='grid gap-12'>
      <p className='text-lg text-subtle'>
        A dashboard is a set of cards on one grid. These rules decide which
        cards to use, how big each one is and what goes in it, so every Oztix
        dashboard reads the same way.
      </p>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Start with the question
        </h2>
        <p className='max-w-prose text-subtle'>
          A dashboard answers a few questions for one person. A promoter asks
          whether a show will sell out. A venue asks which nights need a push.
          Write those questions down first, then give each one a card. If a card
          answers no one’s question, cut it.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>The grid</h2>
        <p className='max-w-prose text-subtle'>
          <Code>Dashboard</Code> sizes itself from its own width, not the
          window. It has 12 tracks from 960px, 6 from 600px and 2 below that, so
          it works in a side pane as well as on a phone. Cards flow in source
          order and the grid never moves them, so reading order always matches
          what people see. Cards in a row stretch to the same height.{' '}
          <Code>Dashboard.Section</Code> groups cards under an h2, and sections
          sit 32px apart.
        </p>
        <Table label='Card sizes' head={SIZE_HEAD} rows={SIZE_ROWS} />
        <p className='max-w-prose text-subtle'>
          There are no custom spans, breakpoint overrides or dense packing. If a
          layout needs a size that isn’t here, it gets a new size in Roadie.
        </p>
        <Stage>
          <DashboardView spec={createShowDashboard()} />
        </Stage>
        <p className='max-w-prose text-sm text-subtle'>
          This is the{' '}
          <Link href='/charts/show-dashboard' className='underline'>
            show dashboard
          </Link>
          . It opens with a <Code>full</Code> note that says what to do, then
          four stat tiles, a <Code>full</Code> chart and two <Code>md</Code>{' '}
          tables side by side. Two <Code>md</Code> charts and a{' '}
          <Code>full</Code> heatmap close it. This column is narrower than
          960px, so it shows 6 tracks or fewer. Here is the same layout at each
          width, and the JSX behind it.
        </p>
        <Stage>
          <RowDiagram sizes={SHOW_DASHBOARD_SIZES} wide />
        </Stage>
        <CodePreview>{DASHBOARD_JSX}</CodePreview>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Rows that fill</h2>
        <p className='max-w-prose text-subtle'>
          Every row must fill at desktop, tablet and phone widths. These
          combinations do.
        </p>
        <Table
          label='Rows that fill'
          head={['Row', ...DASHBOARD_WIDTHS.map((width) => WIDTH_NAME[width])]}
          rows={FILLING_TABLE_ROWS}
          fit
        />
        <p className='max-w-prose text-subtle'>
          On tablet, <Code>lg</Code> takes a full row and <Code>sm</Code> takes
          half. So <Code>lg</Code> then <Code>sm</Code> leaves half a row empty.
          The mirrored <Code>sm</Code> fills it.
        </p>
        <Guideline headingLevel={3} title='Mirror a large card'>
          <Guideline.Do
            example={<RowDiagram sizes={['lg', 'sm', 'sm', 'lg']} />}
          >
            <p>
              Follow <Code>lg</Code> and <Code>sm</Code> with <Code>sm</Code>{' '}
              and <Code>lg</Code>. Both rows fill at every width.
            </p>
          </Guideline.Do>
          <Guideline.Dont example={<RowDiagram sizes={['lg', 'md']} />}>
            <p>
              Don’t follow <Code>lg</Code> with <Code>md</Code>. It leaves gaps
              on desktop and tablet.
            </p>
          </Guideline.Dont>
        </Guideline>
        <p className='max-w-prose text-subtle'>
          In development, <Code>Dashboard.Section</Code> logs a warning for any
          row that leaves a gap. It uses the same check as{' '}
          <Code>validateDashboard</Code>. It only sees the section’s direct
          children. If you wrap a card, pass <Code>size</Code> to the wrapper so
          the check still sees it.
        </p>
        <p className='rounded-lg emphasis-sunken p-4 font-mono text-xs break-words sm:text-sm'>
          {GAP_WARNING}
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Card anatomy</h2>
        <p className='max-w-prose text-subtle'>
          <Code>DataCard</Code> is the shared card. <Code>StatTile</Code>, table
          cards and <Code>Chart</Code> are built on it. Its props match the JSON
          description field for field, so a card in JSX and a card in JSON come
          out the same.
        </p>
        <figure className='grid gap-6'>
          <Chart
            label='Pace to date'
            value={0.61}
            format='percent'
            delta={{ value: 16, format: 'points' }}
            context='Forecast 96% by show day'
            source='Oztix sales. 38 similar shows.'
            size='md'
            legend={
              <ChartLegend
                items={[
                  { label: 'This show', shape: 'line' },
                  { label: 'Forecast', shape: 'dot' },
                  {
                    label: 'Similar shows',
                    shape: 'band',
                    color: 'var(--chart-band)'
                  }
                ]}
              />
            }
          >
            <LineChart
              {...PACE_EXAMPLE}
              takeaway='Tracking ahead of similar shows, forecast to reach 96%'
            />
          </Chart>
          <figcaption>
            <ol className='grid list-decimal gap-3 pl-5 text-subtle'>
              {ANATOMY.map(([part, rule, example]) => (
                <li key={part}>
                  <span className='text-strong'>{part}.</span> {rule}
                  <span className='block text-sm'>
                    In the example, “{example}”
                  </span>
                </li>
              ))}
            </ol>
          </figcaption>
        </figure>
        <p className='max-w-prose text-subtle'>
          The label, headline and context line never wrap. Text that doesn’t fit
          ends in an ellipsis. The full text goes in the tooltip and the
          accessible name. The legend is the only chart text that wraps.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          A number or a sentence
        </h2>
        <p className='max-w-prose text-subtle'>
          The headline is a value with a delta, or a takeaway sentence. Never
          both. Use a value when one number answers the question. Use a takeaway
          when there’s no single number, such as a channel mix or a table.
        </p>
        <Guideline headingLevel={3} title='One headline per card'>
          <Guideline.Do
            example={
              <Tile>
                <StatTile
                  label='Gross revenue'
                  value={118400}
                  format='compactCurrency'
                  delta={{ value: -0.04, format: 'percent' }}
                  context='Last week, before fees'
                />
              </Tile>
            }
          >
            <p>Let the value and delta carry the story.</p>
          </Guideline.Do>
          <Guideline.Dont
            example={
              <Tile>
                <DataCard label='Gross revenue' value='$118.4k'>
                  <p className='text-display-ui-6 text-strong'>
                    Revenue fell 4% on last week
                  </p>
                </DataCard>
              </Tile>
            }
          >
            <p>Don’t add a takeaway that repeats the value.</p>
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Which card answers which question
        </h2>
        <Table
          label='Which card answers which question'
          head={['Question', 'Card', 'Example']}
          rows={QUESTIONS}
        />
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Copy that fits</h2>
        <p className='max-w-prose text-subtle'>
          Copy is sized for the card’s narrowest width. Past these limits it
          truncates.
        </p>
        <Table
          label='Copy limits'
          head={['Size', 'Label', 'Context']}
          rows={LIMIT_ROWS}
        />
        <p className='max-w-prose text-subtle'>
          Chart cards carry the Chart/Table switch in the label’s row, so their
          label budget is tighter than <Code>COPY_LIMITS</Code>.
        </p>
        <Table
          label='Chart label limits'
          head={['Size', 'Label']}
          rows={CHART_LABEL_ROWS}
        />
        <List
          items={[
            'Keep the delta short. It sits next to the value.',
            'Say what the delta is compared with on the context line.',
            'No dashes as punctuation. Use “to” for ranges.',
            'Sentence case for labels, context and takeaways.'
          ]}
        />
        <Guideline headingLevel={3} title='Short label, short delta'>
          <Guideline.Do
            example={
              <Tile>
                <StatTile
                  label='Tickets sold'
                  value={1842}
                  delta={{ value: 214 }}
                  context='This week, of 2,400'
                />
              </Tile>
            }
          >
            <p>Put the comparison on the context line.</p>
          </Guideline.Do>
          <Guideline.Dont
            example={
              <Tile>
                <StatTile
                  label='Total tickets sold this week'
                  value='1,842 ↑ 214 this week vs last week'
                />
              </Tile>
            }
          >
            <p>Don’t pack the comparison into the label or delta.</p>
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>States</h2>
        <p className='max-w-prose text-subtle'>
          Every card takes a <Code>state</Code>. The app sets it. A hidden
          sparkline is not a state.
        </p>
        <div className='grid gap-6'>
          {STATES.map(({ state, when }) => (
            <div key={state} className='grid items-center gap-4 md:grid-cols-2'>
              <div className='grid gap-1'>
                <p className='font-mono text-sm text-strong'>{state}</p>
                <p className='text-subtle'>{when}</p>
              </div>
              <StateCard state={state} />
            </div>
          ))}
        </div>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Card actions</h2>
        <p className='max-w-prose text-subtle'>
          Actions sit at the top right of a card, in the label’s row. They carry
          handlers, so the app adds them and the JSON never does. Pass{' '}
          <Code>actions</Code> to <Code>DataCard</Code>, <Code>StatTile</Code>{' '}
          or <Code>Chart</Code>. For cards described as data, pass{' '}
          <Code>cardActions</Code> to <Code>DashboardView</Code>. It gets each
          card’s spec and returns its actions, or nothing. When{' '}
          <Code>DashboardView</Code> renders on the server, return a client
          component that owns the handlers, not inline handlers.
        </p>
        <CodePreview>{CARD_ACTIONS_CODE}</CodePreview>
        <h3 className='text-display-ui-5 text-strong'>Slot order</h3>
        <List
          items={[
            'The Chart and Table switch comes first, on chart cards.',
            'Then at most one visible action, for the thing people do most on that card.',
            'More comes last, always. Every other action goes in its menu.'
          ]}
        />
        <Guideline headingLevel={3} title='One action, then More'>
          <Guideline.Do
            example={
              <Tile>
                <Chart
                  label='Sales pace'
                  value={0.61}
                  format='percent'
                  size='sm'
                  source='Oztix sales.'
                  actions={
                    <CardMenu
                      label='Sales pace'
                      table={lineChartTable(PACE_EXAMPLE)}
                    />
                  }
                >
                  <LineChart {...PACE_EXAMPLE} />
                </Chart>
              </Tile>
            }
          >
            <p>Put the view switch first and More last.</p>
          </Guideline.Do>
          <Guideline.Dont
            example={
              <Tile>
                <DataCard
                  label='Ticket types'
                  takeaway='VIP is the one to push'
                  actions={
                    <>
                      <IconButton
                        aria-label='Refresh data'
                        size='sm'
                        emphasis='subtler'
                      >
                        <ArrowClockwiseIcon weight='bold' className='size-4' />
                      </IconButton>
                      <IconButton
                        aria-label='Download CSV'
                        size='sm'
                        emphasis='subtler'
                      >
                        <DownloadSimpleIcon weight='bold' className='size-4' />
                      </IconButton>
                      <IconButton
                        aria-label='Edit'
                        size='sm'
                        emphasis='subtler'
                      >
                        <PencilSimpleIcon weight='bold' className='size-4' />
                      </IconButton>
                      <DataCard.MoreButton label='Ticket types' />
                    </>
                  }
                />
              </Tile>
            }
          >
            <p>Don’t line up icon buttons. They crowd out the label.</p>
          </Guideline.Dont>
        </Guideline>
        <h3 className='text-display-ui-5 text-strong'>Always visible</h3>
        <List
          items={[
            'Actions show all the time, not only on hover, so they work on touch and by keyboard.',
            'Tab order follows reading order: the view switch, then the action, then More.',
            'Actions stay in every state, so Refresh data and Remove from dashboard still work on a card that failed to load. The view switch shows only when there’s data.'
          ]}
        />
        <Guideline headingLevel={3} title='Keep actions in view'>
          <Guideline.Do
            example={
              <Tile>
                <DataCard
                  label='Ticket types'
                  takeaway='VIP is the one to push'
                  actions={<CardMenu label='Ticket types' />}
                />
              </Tile>
            }
          >
            <p>Show More at rest, in every state.</p>
          </Guideline.Do>
          <Guideline.Dont code={HOVER_ONLY_CODE}>
            <p>
              Don’t hide actions until hover. Touch has no hover, and a hidden
              button still takes focus.
            </p>
          </Guideline.Dont>
        </Guideline>
        <h3 className='text-display-ui-5 text-strong'>The More menu</h3>
        <p className='max-w-prose text-subtle'>
          Group the menu in this order and leave out what a card can’t do. Build
          it with <Link href='/components/menu'>Menu</Link>: pass{' '}
          <Code>DataCard.MoreButton</Code> to <Code>Menu.Trigger</Code> as its{' '}
          <Code>render</Code>. The button keeps its name, “More actions for” the
          card’s label, and its ref. Name each group with{' '}
          <Code>Menu.GroupLabel</Code>, split groups with{' '}
          <Code>Menu.Separator</Code>, and open the menu with{' '}
          <Code>align=&apos;end&apos;</Code> so it opens back over the card.
        </p>
        <Table
          label='More menu groups'
          head={['Group', 'Items']}
          rows={MENU_GROUPS}
          fit
        />
        <List
          items={[
            <>
              Download CSV from the card’s table. <Code>cardTable(card)</Code>{' '}
              from <Code>@oztix/roadie-charts/tables</Code> builds it on the
              server, for a chart card or a table card.
            </>,
            <>
              Copy as image with <Code>renderChartSvg</Code> from{' '}
              <Code>@oztix/roadie-charts/static</Code>.
            </>,
            'Refresh data shows when the numbers were last updated, as helper text under the item.'
          ]}
        />
        <h3 className='text-display-ui-5 text-strong'>Copy</h3>
        <List
          items={[
            'Sentence case, verb first: “Download CSV”, not “CSV download”.',
            'No dashes as punctuation.',
            'Destructive actions confirm first. Remove from dashboard asks before it removes.'
          ]}
        />
        <h3 className='text-display-ui-5 text-strong'>Label room</h3>
        <p className='max-w-prose text-subtle'>
          More takes room from the label, which truncates past it. Beside More,
          keep chart labels to {ACTIONS_LABEL_LIMITS.sm} characters at{' '}
          <Code>sm</Code> and <Code>md</Code> and {ACTIONS_LABEL_LIMITS.lg} at{' '}
          <Code>lg</Code> and <Code>full</Code>, and stat labels to{' '}
          {ACTIONS_LABEL_LIMITS.stat}. <Code>ACTIONS_LABEL_LIMITS</Code> holds
          them. Table and note labels keep their <Code>COPY_LIMITS</Code>.{' '}
          <Code>validateDashboard</Code> can’t check this, because actions
          aren’t part of the JSON.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Tables on dashboards
        </h2>
        <List
          items={[
            'Use at most two visual columns, sparkline or meter, per table.',
            <>
              Give each column a <Code>priority</Code>. As the card narrows,
              higher numbers hide first. Columns without one always show.
            </>,
            <>
              The “Show all columns” button switches to horizontal scrolling and
              holds the <Code>pin</Code> column in place.
            </>,
            'A sparkline cell needs 5 points. With fewer, it shows “Not enough history”.'
          ]}
        />
        <DataCard
          label='Upcoming shows'
          takeaway='One show is behind similar shows'
          source='Oztix sales. Pace against 38 similar shows.'
        >
          <DataTable
            columns={PORTFOLIO_COLUMNS}
            rows={PORTFOLIO_ROWS}
            caption='Upcoming shows'
          />
        </DataCard>
        <p className='max-w-prose text-sm text-subtle'>
          At this width the sparkline column hides first. Show all columns
          brings it back.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Describe it as data
        </h2>
        <p className='max-w-prose text-subtle'>
          Any dashboard can be written as a JSON description with its numbers
          inline. Card fields match the component props, and{' '}
          <Code>DashboardView</Code> from <Code>@oztix/roadie-charts</Code>{' '}
          renders it. Agents can build and check a dashboard this way before
          anyone sees it.
        </p>
        <CodePreview language='json'>{STAT_CARD_JSON}</CodePreview>
        <p className='max-w-prose text-subtle'>
          <Code>validateDashboard</Code> from{' '}
          <Code>@oztix/roadie-core/dashboard</Code> returns every problem with
          its path.
        </p>
        <CodePreview>{VALIDATE_CODE}</CodePreview>
        <p className='max-w-prose text-subtle'>
          Here the second section puts a <Code>pace</Code> card at{' '}
          <Code>lg</Code> before a <Code>channels</Code> card at <Code>md</Code>
          . It returns these problems.
        </p>
        <Table
          label='Validation problems'
          head={['Path', 'Message', 'Severity']}
          rows={VALIDATE_PROBLEMS}
        />
        <p className='max-w-prose text-subtle'>
          It also checks sizes per card kind, unique ids, visual columns, a
          source on every chart and table card, copy lengths, dashes and
          sentence case.
        </p>
        <p className='max-w-prose text-subtle'>
          <Code>CARD_SPANS</Code> and <Code>COPY_LIMITS</Code> hold the sizes
          and limits above. Import them from{' '}
          <Code>@oztix/roadie-core/dashboard-layout</Code> when you only need
          the layout rules, because that entry doesn’t load Zod.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Accessibility</h2>
        <List
          items={[
            'Each card is a section named by its label. Dashboard sections use h2 headings.',
            'Values and deltas read as sentences, such as “Sell-through, 61%, up 9 points, better. This week, target 85%.”',
            'A plot is an image with a one-line summary from its headline or takeaway. The Table tab is the full alternative, reachable by keyboard.',
            'Colour is never the only signal. Deltas have arrows and words, table status has text, and textures turn on under forced colours.',
            'Nothing animates.'
          ]}
        />
      </section>
    </div>
  )
}
