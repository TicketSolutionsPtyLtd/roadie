import type { ReactNode } from 'react'

import Link from 'next/link'

import { Guideline } from '@/components/Guideline'
import { DatavizSwatches } from '@/components/dataviz/DatavizSwatches'

import { Chart } from '@oztix/roadie-charts/chart'
import { Heatmap } from '@oztix/roadie-charts/heatmap'
import { LineChart } from '@oztix/roadie-charts/line-chart'
import { RankedBars } from '@oztix/roadie-charts/ranked-bars'
import { StackedBars } from '@oztix/roadie-charts/stacked-bars'
import { Code } from '@oztix/roadie-components/code'
import { DataCard } from '@oztix/roadie-components/data-card'
import { Meter } from '@oztix/roadie-components/meter'
import { Sparkline } from '@oztix/roadie-components/sparkline'
import { StatTile } from '@oztix/roadie-components/stat-tile'

import { PACE_EXAMPLE } from '../pace-example'
import { TICKETING_REFERENCE } from '../ticketing-reference'

export const metadata = {
  title: 'Data visualisation',
  description:
    'How to choose, colour, label and write a chart so a client can act on it.',
  category: 'Guidelines',
  order: 1
}

const FORMS = [
  ['Compare', 'RankedBars', 'Channels by tickets sold'],
  ['Change over time', 'LineChart or BarChart', 'Daily sales'],
  ['Pace', 'LineChart with a band', 'This show against similar shows'],
  [
    'Part of a whole',
    'StackedBars or capacity meter',
    'Sold, held and available'
  ],
  ['Spread', 'Histogram', 'Days between buying and the show'],
  ['Drop off', 'Funnel', 'Checkout steps'],
  ['Two measures per show', 'Scatter', 'Pace against sell-through'],
  ['The same chart per group', 'SmallMultiples', 'Scan rate per gate'],
  ['When', 'Heatmap', 'Orders by hour and weekday'],
  ['Where', 'RankedBars with share', 'Top postcodes'],
  ['One number', 'Stat tile, not a chart', 'Tickets sold today']
]

const TERMS = [
  [
    'Pace index',
    'Tickets sold divided by what similar shows had sold at the same days out, times 100. Over 100 is ahead.',
    'LineChart, stat tile'
  ],
  [
    'Sell-through',
    'Tickets sold as a share of sellable capacity, after holds and kills. Never gross capacity.',
    'Capacity meter'
  ],
  [
    'On-sale spike',
    'Orders in the first hours after tickets go on sale, often shown against the forecast for that hour.',
    'Heatmap, annotated BarChart'
  ],
  [
    'Presale and general',
    'Tickets sold before and after the public on-sale.',
    'StackedBars'
  ],
  [
    'Walk-up',
    'Tickets sold on the day of the show.',
    'The end of the LineChart'
  ],
  [
    'No-show rate',
    'Tickets issued but never scanned, as a share of tickets issued.',
    'Stat tile, RankedBars with reference'
  ],
  [
    'Scan rate',
    'Tickets scanned per 15 minutes at each gate, with the running share of fans inside.',
    'BarChart with line, SmallMultiples per gate'
  ],
  ['Resale share', 'Tickets resold as a share of tickets sold.', 'StackedBars'],
  [
    'Ticket type mix',
    'Tickets sold by ticket type, such as GA, VIP or early-bird.',
    'StackedBars, using the pair or trio sets'
  ],
  [
    'Channel and referrer',
    'Where buyers came from before they bought.',
    'RankedBars'
  ],
  [
    'Postcode',
    'Where buyers live, from billing postcodes. Report shares, not counts, when totals differ.',
    'RankedBars'
  ],
  [
    'When fans buy',
    'Orders by hour and weekday, in the venue timezone.',
    'Heatmap'
  ]
]

const WRITING = [
  [
    'Title',
    'States the takeaway with a number or direction. Sentence case, active voice, no colon, no full stop.',
    'Presales doubled after the lineup drop',
    'Presales over time'
  ],
  [
    'Subtitle',
    'One full sentence with what was measured, where and when.',
    'Tickets sold per day across all Hollow Pines Festival ticket types.',
    'tix/day, all TTs'
  ],
  [
    'Numbers',
    'Numerals for every value, commas for thousands, closed-up percent.',
    '12,480 tickets, 68%',
    'twelve thousand, 68 %'
  ],
  [
    'Money',
    'Dollar sign with no space, cents only when the amount isn’t round.',
    '$19.95, $1,200',
    '$ 20.00'
  ],
  [
    'Spans',
    'Use “to”, never a dash.',
    '$50 to $100, Fri 27 to Sun 29 Nov',
    '$50–$100'
  ],
  [
    'Dates and times',
    'Follow the date and time foundation. 24-hour time only on dense axes and in exports.',
    'Fri 27 Nov, 7:30pm',
    '27th Nov, 7:30 PM'
  ],
  [
    'Terms',
    'Use house terms and one name per metric everywhere it appears.',
    'Ticket type, access code, scan rate',
    'Ticket category, promo code, entries'
  ],
  [
    'Annotations',
    'Short full sentences that name the cause. No arrows or symbols.',
    'Lineup announced. Sales tripled that day.',
    'Lineup drop → 3x!!'
  ],
  [
    'Empty states',
    'Say what happened and what to do next.',
    'No sales yet. Tickets go on sale Fri 27 Nov at 9:00am AEST.',
    'No data available'
  ],
  [
    'Source line',
    'Name the data and when it was pulled.',
    'Source: Oztix ticketing data, pulled Mon 21 Sep.',
    'Source: internal data'
  ],
  [
    'Summaries and alt text',
    'Takeaway and numbers first, then the comparison, then the scope. No AI vocabulary or hedging.',
    'Saltwater Sessions sold 4,200 tickets in Sydney, 1,100 more than Melbourne.',
    'This chart showcases the vibrant sales landscape.'
  ]
]

function PaceChart({
  label,
  title,
  size = 'full'
}: {
  label: string
  title: string
  size?: 'md' | 'full'
}) {
  return (
    <Chart
      label={label}
      takeaway={title}
      source='Oztix sales. 38 similar shows, last 3 years.'
      size={size}
    >
      <LineChart {...PACE_EXAMPLE} takeaway={title} />
    </Chart>
  )
}

const WHEN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap(
  (weekday, r) =>
    ['9am', '12pm', '3pm', '6pm', '9pm'].map((hour, c) => ({
      weekday,
      hour,
      orders: [
        [4, 8, 10, 18, 12],
        [5, 9, 11, 20, 13],
        [5, 9, 12, 22, 14],
        [6, 10, 14, 30, 22],
        [8, 12, 18, 42, 36],
        [14, 22, 20, 24, 18],
        [12, 18, 16, 14, 8]
      ][r]![c]!
    }))
)

const VERSUS = [
  'The Lantern Room',
  'Harbourside Hall',
  'Wattle Street Social'
].flatMap((venue, r) =>
  ['Floor', 'Balcony'].map((section, c) => ({
    venue,
    section,
    versus: [0.12, -0.06, 0.04, -0.1, 0.08, -0.03][r * 2 + c]!
  }))
)

const MIX = [
  { show: 'Friday', type: 'GA', sold: 1210 },
  { show: 'Friday', type: 'VIP', sold: 232 },
  { show: 'Friday', type: 'Early bird', sold: 300 },
  { show: 'Saturday', type: 'GA', sold: 1480 },
  { show: 'Saturday', type: 'VIP', sold: 310 },
  { show: 'Saturday', type: 'Early bird', sold: 300 }
]

function Table({
  label,
  head,
  rows
}: {
  label: string
  head: string[]
  rows: ReactNode[][]
}) {
  return (
    <div
      role='region'
      aria-label={label}
      tabIndex={0}
      className='overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2'
    >
      <table className='w-full min-w-2xl text-sm'>
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

function PaletteBlock({
  title,
  description,
  children
}: {
  title: string
  description: ReactNode
  children: ReactNode
}) {
  return (
    <div className='grid gap-4'>
      <div className='grid gap-1'>
        <h3 className='text-display-ui-5 text-strong'>{title}</h3>
        <p className='max-w-prose text-sm text-subtle'>{description}</p>
      </div>
      <div className='grid gap-8 rounded-xl border border-subtler p-4 sm:p-6'>
        {children}
      </div>
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

export default function DataVisualisationPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <p className='text-lg text-subtle'>
          Every chart we show helps a promoter, venue or festival decide
          something. Which show to add, when to push marketing, whether a night
          will sell out. These rules keep charts in the dashboard, in reports
          and on slides reading as one system.
        </p>
      </div>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Start with the decision
        </h2>
        <p className='max-w-prose text-subtle'>
          Name the question a client will act on before you draw anything. The
          title answers it. If the chart has no answer to give, it probably
          shouldn’t be a chart.
        </p>
        <Guideline headingLevel={3} title='Put the answer in the title'>
          <Guideline.Do
            example={
              <div className='w-80 max-w-full'>
                <PaceChart
                  label='Sales pace'
                  title='Tracking 16 points ahead of similar shows'
                  size='md'
                />
              </div>
            }
          >
            <p>Put the answer in the title.</p>
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='w-80 max-w-full'>
                <PaceChart
                  label='Sales to date'
                  title='Sales over time'
                  size='md'
                />
              </div>
            }
          >
            <p>Don’t make the reader work out the point.</p>
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Pick the form from the job
        </h2>
        <Table
          label='Forms by job'
          head={['Job', 'Form', 'Ticketing example']}
          rows={FORMS}
        />
        <p className='max-w-prose text-subtle'>
          A stat tile or a two-row table often beats a plot. If there’s no shape
          to see, show the number.
        </p>
        <p className='max-w-prose text-subtle'>
          In a dashboard, these forms sit inside cards. See{' '}
          <Link href='/charts/dashboards' className='underline'>
            dashboard design
          </Link>{' '}
          for sizing and layout.
        </p>
        <div className='grid gap-4 sm:grid-cols-3'>
          <StatTile
            label='Tickets sold'
            value={1842}
            trend={[1200, 1340, 1480, 1600, 1720, 1780, 1842]}
            context='This week'
          />
          <DataCard size='sm' label='VIP sell-through' context='Target 85%'>
            <Meter label='VIP sell-through' value={68} max={100} target={85} />
          </DataCard>
          <div className='w-48'>
            <Sparkline
              values={[1200, 1340, 1480, 1600, 1720, 1780, 1842]}
              label='Tickets sold, this week'
            />
          </div>
        </div>
        <div className='max-w-xl'>
          <Chart
            label='Where buyers came from'
            takeaway='Email brings in nearly half of orders'
            source='Oztix sales.'
            size='md'
          >
            <RankedBars
              data={[
                { channel: 'Email', orders: 612 },
                { channel: 'Instagram', orders: 388 },
                { channel: 'Direct', orders: 301 }
              ]}
              x='channel'
              y='orders'
              highlight='Email'
            />
          </Chart>
        </div>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Colour by job</h2>
        <p className='max-w-prose text-subtle'>
          Each palette has one job. Mixing jobs is how charts start lying.
        </p>
        <div className='grid gap-10'>
          <PaletteBlock
            title='Categorical tells series apart'
            description={
              <>
                Use slots in order and never cycle them. A series keeps its
                colour when you sort or filter. Use 6 at most, then group the
                rest into Other. For 2 or 3 series, use{' '}
                <Code>--chart-pair-*</Code> or <Code>--chart-trio-*</Code>.
              </>
            }
          >
            <DatavizSwatches kind='categorical' />
            <div className='max-w-xl'>
              <Chart
                label='Ticket type mix'
                takeaway='GA carries both nights'
                source='Oztix sales.'
                size='md'
              >
                <StackedBars data={MIX} x='show' y='sold' series='type' />
              </Chart>
            </div>
          </PaletteBlock>
          <PaletteBlock
            title='Sequential shows how much'
            description='Stage heat runs from the surface to the strongest colour. In dark mode the busiest cells glow.'
          >
            <DatavizSwatches kind='heat' />
            <Chart
              label='When fans buy'
              takeaway='Fans buy most on Friday evenings'
              source='Oztix sales, venue time.'
              size='lg'
            >
              <Heatmap
                data={WHEN}
                rows='weekday'
                columns='hour'
                value='orders'
              />
            </Chart>
          </PaletteBlock>
          <PaletteBlock
            title='Diverging shows ahead of or behind'
            description='Cool is ahead, warm is behind, grey is on the benchmark.'
          >
            <DatavizSwatches kind='diverging' />
            <div className='max-w-xl'>
              <Chart
                label='Pace by section'
                takeaway='The balconies are behind'
                source='Oztix sales.'
                size='md'
              >
                <Heatmap
                  data={VERSUS}
                  rows='venue'
                  columns='section'
                  value='versus'
                  scale='diverging'
                  format='percent'
                />
              </Chart>
            </div>
          </PaletteBlock>
          <PaletteBlock
            title='Status carries meaning'
            description='Good, warning, serious and critical. Only for meaning, never as a series colour, and always with an icon or label.'
          >
            <DatavizSwatches kind='status' />
            <div className='grid gap-3 sm:grid-cols-3'>
              <StatTile
                label='Sell-through'
                value={0.61}
                format='percent'
                delta={{ value: 9, format: 'points' }}
                context='Target 85%'
              />
              <StatTile
                label='Gross revenue'
                value={118400}
                format='compactCurrency'
                delta={{ value: -0.04, format: 'percent' }}
                context='This week'
              />
              <StatTile
                label='Orders'
                value={1310}
                delta={{ value: 0.18, format: 'percent' }}
                context='This week'
              />
            </div>
            <p className='max-w-prose text-sm text-subtle'>
              Status colour always comes with an arrow and words.
            </p>
          </PaletteBlock>
        </div>
        <Guideline headingLevel={3} title='Emphasis and ink'>
          <Guideline.Do>
            <p>
              Highlight the story series in <Code>--chart-highlight</Code> and
              put context in <Code>--chart-context</Code>.
            </p>
          </Guideline.Do>
          <Guideline.Dont>
            <p>
              Don’t colour text in a series colour. Labels and values use chart
              ink.
            </p>
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Reading aids</h2>
        <p className='max-w-prose text-subtle'>
          Four ideas come up in almost every ticketing chart. Draw them the same
          way everywhere.
        </p>
        <List
          items={[
            <>
              <span className='text-strong'>Compared with</span> is a soft band
              for the middle half of similar shows, with a dashed median. Say
              what the comparison is built from.
            </>,
            <>
              <span className='text-strong'>This show</span> is one 2px line in
              the highlight colour.
            </>,
            <>
              <span className='text-strong'>Prediction</span> is a dotted
              continuation inside a faint cone that shows the range.
            </>,
            <>
              <span className='text-strong'>Goal</span> is a short tick at the
              right edge with its label.
            </>,
            <>
              <span className='text-strong'>Now</span> is a labelled dot, not a
              line across the chart.
            </>
          ]}
        />
        <PaceChart
          label='Pace against similar shows'
          title='Tracking ahead of similar shows'
        />
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Keep it honest</h2>
        <List
          items={[
            'Use one y-axis. Two measures on different scales become two charts, or both indexed to 100.',
            'Start bars at zero.',
            'Measure sell-through against sellable capacity, not gross capacity.',
            'Show a range with every forecast.',
            'Name the comparison period and the set of similar shows.'
          ]}
        />
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Labels and type</h2>
        <List
          items={[
            'Charts use Intermission with tabular figures, so columns and ticks line up.',
            'Every chart has a title, a subtitle for scope and a source line.',
            'Label up to 4 series directly. Two or more series also get a legend. A single series needs neither.',
            <>
              Format dates and times with the{' '}
              <Link href='/foundations/date-and-time' className='underline'>
                date and time
              </Link>{' '}
              rules.
            </>
          ]}
        />
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Writing for charts</h2>
        <p className='max-w-prose text-subtle'>
          Chart copy follows the Oztix voice and tone guidelines, the language
          and grammar guidelines, and unslop. No dashes as punctuation,
          anywhere.
        </p>
        <Table
          label='Writing for charts'
          head={['Part', 'Rule', 'Do', 'Don’t']}
          rows={WRITING}
        />
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Accessibility</h2>
        <List
          items={[
            'Never identify a series by colour alone. Pair it with a label, a legend or a pattern.',
            'Offer a table view of every chart.',
            'Write a text summary that doubles as alt text.',
            <>
              Light categorical slots never carry text. The{' '}
              <Link href='/tokens/dataviz' className='underline'>
                tokens page
              </Link>{' '}
              lists which ones.
            </>,
            <>
              Leave a 2px <Code>--chart-gap</Code> between touching fills.
            </>,
            'Hover adds detail. It is never the only way to read a value.',
            'Respect reduced motion.'
          ]}
        />
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          One chart, three places
        </h2>
        <List
          items={[
            <>
              <span className='text-strong'>Dashboard.</span> Interactive, with
              filters in one row above the charts.
            </>,
            <>
              <span className='text-strong'>Report.</span> Static and readable
              without hover. The source line is required.
            </>,
            <>
              <span className='text-strong'>Slides.</span> Fewer marks, bigger
              type and one takeaway per slide. Build up in steps if it helps the
              story.
            </>
          ]}
        />
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>
          Ticketing reference
        </h2>
        <h3 className='text-display-ui-5 text-strong'>Terms</h3>
        <Table
          label='Terms'
          head={['Term', 'What it means', 'Chart']}
          rows={TERMS}
        />
        <h3 className='text-display-ui-5 text-strong'>Questions and charts</h3>
        <Table
          label='Questions and charts'
          head={['Question', 'Term', 'Chart']}
          rows={TICKETING_REFERENCE.map((row) => [
            row.question,
            row.term,
            row.chart
          ])}
        />
        <p className='max-w-prose text-sm text-subtle'>
          Every token and its value are on the{' '}
          <Link href='/tokens/dataviz' className='underline'>
            data visualisation tokens
          </Link>{' '}
          page.
        </p>
      </section>
    </div>
  )
}
