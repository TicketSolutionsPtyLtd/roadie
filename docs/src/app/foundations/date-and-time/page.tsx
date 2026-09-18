import type { Metadata } from 'next'
import Link from 'next/link'

import { Guideline } from '@/components/Guideline'

export const metadata: Metadata = {
  title: 'Date and time',
  description:
    'One scale, seven rules, and one implementation for every date and time we show.',
  category: 'Content'
}

const DATE_TIME = '/components/date-time'

const COMPONENTS = [
  {
    showing: 'A moment',
    component: '<DateTime>',
    href: DATE_TIME,
    props: 'dateStyle, timeStyle',
    reads: 'Fri 27 Nov 2026, 7:30pm',
    formatter: 'formatLong'
  },
  {
    showing: 'A moment, as elapsed time',
    component: '<DateTime relative>',
    href: DATE_TIME,
    props: 'cutoffMs',
    reads: '3 minutes ago',
    formatter: 'formatRelative'
  },
  {
    showing: 'A span between two moments',
    component: '<DateTime to>',
    href: DATE_TIME,
    props: 'showDuration, sameNight',
    reads: 'Fri 27 to Sun 29 Nov 2026',
    formatter: 'formatDateRange'
  },
  {
    showing: 'A length of time',
    component: '<Duration>',
    href: '/components/duration',
    props: 'durationStyle',
    reads: '2 hours 30 minutes',
    formatter: 'formatDuration'
  },
  {
    showing: 'Time remaining, ticking',
    component: '<Countdown>',
    href: '/components/countdown',
    props: 'seconds, display',
    reads: '4:32',
    formatter: 'formatDuration'
  },
  {
    showing: 'A calendar tile',
    component: '<CalendarTile>',
    href: '/components/calendar-tile',
    props: 'weekday, dateTime',
    reads: 'NOV 27',
    formatter: 'formatGlyph'
  },
  {
    showing: 'A chart axis tick',
    component: '<DateTime render>',
    href: DATE_TIME,
    props: "dateStyle 'short', timeStyle 'numeric'",
    reads: '27 Nov 19:30',
    formatter: 'formatDateTime'
  }
]

const DATE_STYLES = [
  {
    style: 'full',
    renders: 'Friday, 27 November 2026',
    use: 'A single date with room around it. The date is the point of the page.'
  },
  {
    style: 'long',
    renders: 'Fri 27 Nov 2026',
    use: 'The everyday default. Lists, cards, table rows, summaries.'
  },
  {
    style: 'medium',
    renders: '27 Nov 2026',
    use: 'The day of week does not help the reader. Order dates, settlement dates.'
  },
  {
    style: 'short',
    renders: '27 Nov',
    use: 'Context already supplies the year. Chart ticks, group headings.'
  },
  {
    style: 'iso',
    renders: '2026-11-27',
    use: 'Exports, filenames, anything sorted or parsed. Never shown to a customer.'
  }
]

const TIME_STYLES = [
  {
    style: 'long',
    renders: '7:30pm AEDT',
    use: 'The reader may be elsewhere and has to act on it. On-sale times, national tours, anything someone sets an alarm for.'
  },
  {
    style: 'medium',
    renders: '7:30pm',
    use: 'The default. The reader is in the venue’s zone, or the zone is already established nearby.'
  },
  {
    style: 'short',
    renders: '7:30pm · 7pm',
    use: 'A dense row where the time is one fact among several. A ticket tag, a chip, a chart tooltip.'
  },
  {
    style: 'numeric',
    renders: '19:30',
    use: 'Charts and dense tables. Fixed width, sorts as it reads. A buyer should never meet it.'
  },
  {
    style: '(omitted)',
    renders: 'not shown',
    use: 'The date alone is the answer. A festival’s date range, a settlement date.'
  }
]

const MOMENTS = [
  {
    kind: 'Event time',
    means: 'When something happens at a place. Doors, set times, the show.',
    zone: 'The venue’s. Never converted.',
    example: 'Fri 27 Nov 2026, 7:30pm'
  },
  {
    kind: 'Access time',
    means:
      'When the reader must do something from wherever they are. On sale, presale, registration opening.',
    zone: 'The venue’s, always labelled.',
    example: 'Fri 27 Nov, 9:00am AEDT'
  },
  {
    kind: 'Timestamp',
    means: 'When something was recorded. An order, an edit, a note.',
    zone: 'The reader’s.',
    example: '27 Nov 2026, 2:14pm'
  }
]

const PAST_LADDER = [
  ['Under a minute', 'just now'],
  ['Under an hour', '3 minutes ago'],
  ['Under a day', '5 hours ago'],
  ['One day', 'yesterday'],
  ['Under a week', '3 days ago'],
  ['Older', 'Tue 17 Nov 2026']
]

const FUTURE_LADDER = [
  [
    'Over a week',
    'Mon 7 Dec 2026',
    'A date. Nobody counts down from nine days.'
  ],
  ['Under a week', 'in 5 days', 'Close enough to feel soon.'],
  ['One day', 'tomorrow', 'The word beats the number.'],
  [
    'Today',
    '9:00am AEDT',
    'Absolute. You cannot set an alarm from “in 4 hours”.'
  ]
]

const CUTOFFS = [
  [
    'Notification, activity feed',
    '1 hour',
    'Anything older wants a real time.'
  ],
  ['Audit row, note, comment', '7 days', 'The default.'],
  ['“Last updated” on a report', '7 days', 'Recency is the whole signal.'],
  [
    'Anything a person turns up to',
    'Do not use it',
    'A countdown is not a plan.'
  ]
]

const MACHINE_VALUES = [
  ['A date', '2026-11-27', 'A calendar date has no zone. Do not invent one.'],
  [
    'A date and time',
    '2026-11-27T19:30:00+10:00',
    'The offset is what makes it an instant.'
  ],
  ['A time only', '19:30', 'Rare. Only where the date is already established.']
]

const DATA_CONTEXTS = [
  [
    'Axis tick',
    "dateStyle 'short' + timeStyle 'numeric'",
    '27 Nov 19:30',
    'Dozens on screen at once. No weekday, no year, no meridiem.'
  ],
  [
    'Tooltip',
    "dateStyle 'long' + timeStyle 'medium'",
    'Fri 27 Nov 2026, 7:30pm',
    'Restores everything the tick dropped. That is what makes the tick safe.'
  ],
  [
    'Table column, date identifies the row',
    "dateStyle 'medium'",
    '27 Nov 2026',
    'An order or settlement date. The weekday is not what the reader is comparing.'
  ],
  [
    'Table column, weekday is a variable',
    "dateStyle 'long'",
    'Fri 27 Nov 2026',
    'An events list. The weekday is a dimension the reader analyses down the column.'
  ],
  [
    'Table column, with time',
    "+ timeStyle 'numeric'",
    '27 Nov 2026 19:30',
    'Two fixed-width fields. The column aligns and sorts.'
  ],
  [
    'Export cell',
    "dateStyle 'iso' + timeStyle 'numeric'",
    '2026-11-27 19:30',
    'Sorts lexicographically. Unambiguous in any locale.'
  ],
  [
    'Sort or group key',
    'Not a display format',
    'not shown',
    'Key on the instant. A formatted string is not a key.'
  ]
]

const ZONES = [
  ['AEST / AEDT', 'NSW, VIC, TAS, ACT', 'Observes DST'],
  ['AEST', 'QLD', 'No DST'],
  ['ACST / ACDT', 'SA', 'Observes DST'],
  ['ACST', 'NT', 'No DST'],
  ['AWST', 'WA', 'No DST'],
  ['LHST / LHDT', 'Lord Howe Island', 'Half hour DST shift']
]

const YEAR_RULE = [
  ['full, long, medium. Standing alone', 'Dropped when it is the current year'],
  [
    'full, long, medium. In a list or table',
    'Always shown. Siblings may span years'
  ],
  ['short', 'Never. That is what the style means'],
  ['iso', 'Always'],
  ['Range, both ends same year', 'On the later end only'],
  ['Range straddling a year', 'Both ends']
]

function Table({
  head,
  rows,
  mono = 2
}: {
  head: string[]
  rows: (string | React.ReactNode)[][]
  mono?: number
}) {
  return (
    <div className='overflow-x-auto'>
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
            <tr key={i} className='border-b border-subtler'>
              {cells.map((c, j) => (
                <td
                  key={j}
                  className={
                    j < mono
                      ? `py-2 pr-4 font-mono text-xs ${j === 0 ? 'text-strong' : ''}`
                      : 'py-2 pr-4 text-subtle'
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

export default function DateAndTimePage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <p className='text-lg text-subtle'>
          Someone can meet the same event half a dozen times. An event page, a
          checkout summary, a listing card, a report. They should see the date
          and time spelled the same way every time.
        </p>
      </div>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Choosing</h2>
        <p className='max-w-prose text-subtle'>
          In React, always a component. The styles below are how you configure
          one, not things you call yourself.
        </p>
        <Table
          head={[
            'What you are showing',
            'Component',
            'Configured with',
            'Reads',
            'Without React'
          ]}
          rows={COMPONENTS.map((c) => [
            c.showing,
            <Link key={c.component} href={c.href} className='underline'>
              {c.component}
            </Link>,
            c.props,
            c.reads,
            c.formatter
          ])}
        />
        <p className='max-w-prose text-subtle'>
          A component renders a{' '}
          <a
            href='https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time'
            target='_blank'
            rel='noreferrer'
            className='underline'
          >
            <code>time</code>
          </a>{' '}
          element and sets its machine-readable value for you. That attribute is
          easy to get wrong, and wrong silently.
        </p>

        <p className='max-w-prose text-subtle'>
          Every component is a thin call into a formatter, and the formatters
          are exported. The test: if it renders, use the component; if it is a
          string going into an attribute, a file or another system, use the
          formatter. Each component page lists its own under{' '}
          <strong>Without React</strong>.
        </p>
        <p className='max-w-prose text-subtle'>
          Two cases look like exceptions and are not. A chart tooltip is
          ordinary HTML, so <code>DateTime</code> works there; only the axis is
          SVG, and <code>render</code> covers it. A range has no element of its
          own, which argues against a single <code>time</code>, not against a
          component: <code>&lt;DateTime to&gt;</code> renders one per end.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>The scale</h2>
        <p className='max-w-prose text-subtle'>
          One scale, from spelled out to machine readable. Each step drops
          exactly one thing. Picking a style is a question about the reader. Do
          they need the weekday? Do they need the year?
        </p>
        <Table
          head={['Style', 'Renders', 'Reach for it when']}
          rows={DATE_STYLES.map((s) => [s.style, s.renders, s.use])}
        />
        <p className='max-w-prose text-subtle'>
          The names are{' '}
          <a
            href='https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat'
            target='_blank'
            rel='noreferrer'
            className='underline'
          >
            <code>Intl.DateTimeFormat</code>
          </a>
          &rsquo;s. The output departs from it twice, on purpose.{' '}
          <code>long</code> keeps a weekday where Intl drops it.{' '}
          <code>iso</code> replaces Intl&rsquo;s numeric <code>short</code>,
          which renders <code>27/11/26</code> and is ambiguous outside
          Australia.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Time is a separate axis
        </h3>
        <p className='max-w-prose text-subtle'>
          Time is a separate option. It is not a property of the date style. Any
          date style can carry a time. A date style on its own never does. The
          step names are the same words, so <code>medium</code> means the same
          kind of thing on both axes: the everyday form, one step down from the
          fullest.
        </p>
        <Table
          head={['Style', 'Renders', 'Reach for it when']}
          rows={TIME_STYLES.map((s) => [s.style, s.renders, s.use])}
        />
        <p className='max-w-prose text-subtle'>
          A date and a time are joined with a comma, which is the
          platform&rsquo;s own separator. The meridiem closes up against the
          digits at every style, which is where the house style departs from the
          platform. Under <code>iso</code> the time switches to 24 hour, joins
          with a space and carries no zone name, because a spreadsheet cell is
          read as local wall-clock. It carries no offset either, which is why{' '}
          <code>formatMachine</code> exists for markup.
        </p>
        <p className='max-w-prose text-subtle'>
          The choice is about the reader, not about space. <code>long</code> and{' '}
          <code>medium</code> differ by whether the reader can be trusted to
          know the zone. <code>short</code> is the one place minutes are
          dropped, so reach for it only where the time is incidental.
        </p>
        <p className='max-w-prose text-subtle'>
          <code>long</code> means different things on the two axes, exactly as
          it does in Intl. <code>dateStyle: &apos;long&apos;</code> is{' '}
          <code>Fri 27 Nov 2026</code>; <code>timeStyle: &apos;long&apos;</code>{' '}
          adds the zone. They are independent, so{' '}
          <code>
            &#123; dateStyle: &apos;medium&apos;, timeStyle: &apos;long&apos;
            &#125;
          </code>{' '}
          is an ordinary pairing.
        </p>
        <Guideline
          title='Name the zone when someone has to act across one'
          description='A sale opening is the clearest case. Somebody in Perth needs to know whether to set an alarm for 9am or 6am.'
        >
          <Guideline.Do
            code={`On sale Fri 27 Nov, 9:00am AEDT\nDoors 7:30pm\nSold 7:30pm · Sec A Row 12`}
          >
            The zone where it changes a decision. Left off where the reader is
            standing at the venue. Dropped entirely where the time is one fact
            in a row.
          </Guideline.Do>
          <Guideline.Dont
            code={`On sale Fri 27 Nov, 9:00am\nDoors 7:30pm AEDT AEDT\nDoors 7pm`}
          >
            A national on-sale with no zone. A zone repeated because the
            surrounding copy already said it. And a door time missing its
            minutes, which only <code>short</code> may do.
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>The rules</h2>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            1. The reader picks the style
          </h3>
          <p className='max-w-prose text-subtle'>
            Pick by what the reader needs, not by which screen you are on. What
            is not allowed is two spellings of the same thing in different
            places.
          </p>
        </div>

        <Guideline
          title='2. Weekday abbreviation follows the month'
          description='Abbreviated with abbreviated, full with full. A date never mixes registers with itself. The scale guarantees this, including the months the locale spells with four letters, such as Sept. You only break it by hand rolling.'
        >
          <Guideline.Do code={`Fri 27 Nov\nFriday, 27 November`}>
            Both halves agree, because the style decides both.
          </Guideline.Do>
          <Guideline.Dont code={`Fri, 27 November\nFriday, 27 Nov`}>
            A short weekday against a long month. This shipped inside Roadie
            itself for months. It is the reason this page exists.
          </Guideline.Dont>
        </Guideline>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            3. The year is a disambiguator
          </h3>
          <p className='max-w-prose text-subtle'>
            Show it unless something already on screen establishes it. Measured
            in the <strong>venue&rsquo;s</strong> timezone. Two people in
            different states then agree about a New Year&rsquo;s Eve event.
          </p>
          <Table head={['Where', 'Year']} rows={YEAR_RULE} mono={1} />
          <p className='max-w-prose text-subtle'>
            <code>context</code> defaults to <code>&apos;list&apos;</code>. A
            forgotten context yields a slightly verbose date. Never an ambiguous
            one.
          </p>
        </div>

        <Guideline
          title='4. One clock, set once'
          description={
            <>
              Lowercase, minutes always, and no space before the meridiem. That
              last part is a deliberate departure: the platform&rsquo;s own
              short time spaces it. Call sites never need a defensive{' '}
              <code>toLowerCase()</code>.
            </>
          }
        >
          <Guideline.Do code={`7:30pm\n7:30pm AEDT\n7pm   (short only)`}>
            Minutes are always present, so a column of times aligns.{' '}
            <code>short</code> is the single documented exception, for rows
            where the time is incidental.
          </Guideline.Do>
          <Guideline.Dont code={`7:30 pm\n7:30 PM\n7.30pm\n7:30:00pm`}>
            Four spellings of one time. The spaced meridiem is the near miss to
            watch for. Seconds are never display information, and 24 hour
            belongs only to <code>numeric</code> and <code>iso</code>.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='5. One separator per meaning'
          description={
            <>
              A comma joins a date to its time. The word <code>to</code> joins
              the two ends of a range. A middot <code>&middot;</code> separates
              a date from an adjacent fact. Never a dash of any kind.
            </>
          }
        >
          <Guideline.Do
            code={`Fri 27 Nov 2026, 7:30pm\nFri 27 to Sun 29 Nov 2026\nFri 27 Nov 2026 · 3 days`}
          >
            The separator tells you what the next token is. And it survives
            being read aloud.
          </Guideline.Do>
          <Guideline.Dont
            code={`12:00pm - 10:00pm · Sun 29 Nov\nFri 27 – Sun 29 Nov 2026`}
          >
            A hyphen joining a range, with a middot introducing an end date so
            it reads as part of it. And an en dash, which a screen reader may
            skip entirely.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='6. Show a time only when it changes something'
          description='A time earns its place when the reader can act on it, or when it changes a decision. Otherwise the date is the unit of meaning and the time is noise.'
        >
          <Guideline.Do
            code={`Doors 7:30pm\nOn sale Fri 27 Nov, 9:00am AEDT\nEdited 27 Nov 2026, 2:14pm`}
          >
            Someone turns up, sets an alarm, or checks which edit was latest.
          </Guideline.Do>
          <Guideline.Dont
            code={`Fri 27 to Sun 29 Nov 2026, 12:00am\nSettled 27 Nov 2026, 12:00am\nReport period: 1 Nov 2026, 12:00am`}
          >
            A midnight that means nothing. The date alone was the answer.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='7. Format in the zone the moment belongs to'
          description={
            <>
              An event time belongs to its venue. A timestamp belongs to whoever
              is reading it. <code>timeZone</code> is required so this is always
              a decision. There is no fallback to the browser.
            </>
          }
        >
          <Guideline.Do
            code={`formatLong(startsAt, {\n  timeZone: venue.timeZone\n})\n\nformatMedium(placedAt, {\n  timeZone: viewerTimeZone(),\n  timeStyle: 'medium'\n})`}
          >
            An 11pm show reads <code>Fri 27 Nov</code> from every state. An
            order reads in the hours the reader actually worked.
          </Guideline.Do>
          <Guideline.Dont
            code={`new Date(startsAt).toLocaleDateString()\nformat(startsAt, 'dd MMM yyyy')`}
          >
            Both render in the browser&rsquo;s zone by accident. A late evening
            event then shows the wrong day for half the country.
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Which clock</h2>
        <p className='max-w-prose text-subtle'>
          A moment belongs to a place, and which place depends on what kind of
          moment it is. Rule 7 turns on the distinction, so it is worth being
          explicit.
        </p>
        <Table
          head={['Kind', 'Means', 'Timezone', 'Looks like']}
          rows={MOMENTS.map((m) => [m.kind, m.means, m.zone, m.example])}
          mono={1}
        />
        <p className='max-w-prose text-subtle'>
          A timestamp usually wants <code>medium</code>. The weekday of an audit
          entry tells the reader nothing. An event time usually wants{' '}
          <code>long</code> or <code>full</code>, because the weekday is often
          the whole reason someone is looking.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Why an event time is never converted
        </h3>
        <p className='max-w-prose text-subtle'>
          The usual advice is to convert everything into the reader&rsquo;s
          local zone. That is right for a meeting, where each attendee joins
          from wherever they are sitting. It is wrong here.
        </p>
        <p className='max-w-prose text-subtle'>
          A buyer will be standing at the venue when the doors open. Converting
          an 8pm Perth show into 11pm for a reader in Sydney does not save them
          arithmetic. It tells them the wrong time. The venue&rsquo;s clock is
          not a formatting preference. It is the answer.
        </p>
        <Guideline
          title='Convert what the reader acts on, not what they attend'
          description='The test is where the reader will be when the moment arrives.'
        >
          <Guideline.Do
            code={`Doors 8:00pm\nOn sale Fri 27 Nov, 9:00am AEDT\nOrder placed 2:14pm`}
          >
            The show in venue time, because that is where they will be. The on
            sale labelled, because they act from home. The order in their own
            time, because that is when it happened to them.
          </Guideline.Do>
          <Guideline.Dont
            code={`Doors 11:00pm   (a Perth show, read from Sydney)\nOn sale 9:00am\nOrder placed 2:14pm AWST`}
          >
            A show time nobody can use. An on sale that is three hours out for
            half the country. And a timestamp dressed in a zone the reader has
            never been in.
          </Guideline.Dont>
        </Guideline>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          An access time may need both
        </h3>
        <p className='max-w-prose text-subtle'>
          A national on sale is the one case where a second clock earns its
          place. The reader is at their own computer, competing for tickets.
          Lead with the venue&rsquo;s zone, because that is what the promoter
          announced, and offer theirs after it.
        </p>
        <pre className='overflow-x-auto rounded-xl bg-subtle p-4 text-sm'>
          <code>{`On sale Fri 27 Nov, 9:00am AEDT
6:00am your time`}</code>
        </pre>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Say when the day moves
        </h3>
        <p className='max-w-prose text-subtle'>
          The most common silent failure in any timezone code is a conversion
          that lands on a different calendar day. Whenever a second clock is
          shown and it falls on another date, say so. Never show a bare time
          that is quietly a day out.
        </p>
        <Guideline
          title='Show the date when a conversion crosses midnight'
          description='A reader who sees only a time assumes it is the same day. Half the time it is not.'
        >
          <Guideline.Do
            code={`10:00pm AEDT\n7:00pm your time\n\n12:30am AEDT\n9:30pm your time, Thu 26 Nov`}
          >
            The second reads without a date only while the day is unchanged.
            When it moves, the date comes with it.
          </Guideline.Do>
          <Guideline.Dont code={`12:30am AEDT\n9:30pm your time`}>
            The reader sets an alarm for the wrong night.
          </Guideline.Dont>
        </Guideline>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          All day means every zone
        </h3>
        <p className='max-w-prose text-subtle'>
          A date with no time does not belong to a zone and must never be
          shifted by one. A public holiday, a birthday, an on-sale date with no
          announced hour: the same date everywhere. Converting it is how a date
          silently becomes the day before.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Why we do not print the offset
        </h3>
        <p className='max-w-prose text-subtle'>
          A common recommendation is to pair the abbreviation with its offset,{' '}
          <code>9:00am AEST (UTC+10)</code>, because abbreviations collide
          internationally: <code>CST</code> is Central US, China and Cuba.
        </p>
        <p className='max-w-prose text-subtle'>
          Australian abbreviations do not collide with each other, and the
          audience reads them fluently. People do not think in offsets, so an
          offset is noise for almost every reader. Add one only where the
          audience is genuinely international, and never in place of the
          abbreviation.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          The abbreviation needs a place beside it
        </h3>
        <p className='max-w-prose text-subtle'>
          <code>AEST</code> and <code>AEDT</code> differ by one character and
          one hour. For half the year Queensland and New South Wales sit on
          opposite sides of it. A reader in Brisbane has to catch a single
          letter to know the time is not their own.
        </p>
        <p className='max-w-prose text-subtle'>
          Usually the place is already on the page. An event page names its
          venue; a listing names a city. Where a time appears without one beside
          it, name the place too.
        </p>
        <Guideline
          title='Let the layout carry the place, or say it'
          description='The abbreviation is a confirmation, not an introduction.'
        >
          <Guideline.Do
            code={`The Lyrebird, Foxbridge VIC\nDoors 8:00pm AEDT\n\nOn sale 9:00am AEDT, Sydney\n8:00am your time`}
          >
            The venue answers where, so the abbreviation only has to confirm it.
            The notification has no venue on it, so the place comes with the
            time.
          </Guideline.Do>
          <Guideline.Dont
            code={`On sale 9:00am AEDT\nOn sale 9:00am Australia/Sydney\nOn sale 9:00am AET`}
          >
            A bare abbreviation with no place. A database identifier in copy.
            And a generic form that hides daylight saving, which is the one
            thing the reader needed to know.
          </Guideline.Dont>
        </Guideline>
        <p className='max-w-prose text-subtle'>
          Do not reach for <code>Intl</code>&rsquo;s generic zone names to solve
          this. <code>shortGeneric</code> renders Sydney as <code>AET</code> and
          Brisbane as <code>AEST</code>, so it removes the daylight saving
          distinction from one and not the other, making the two states harder
          to tell apart rather than easier.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Tools where the venue cannot be assumed
        </h3>
        <p className='max-w-prose text-subtle'>
          A buyer is usually local to the event they are looking at. Someone
          running events often is too, and just as often is not: the same desk
          handles venues in several states. They also set the on-sale times
          thousands of buyers act on, so a zone read wrong here is an incident
          rather than an inconvenience.
        </p>
        <p className='max-w-prose text-subtle'>
          Two rules bind harder here. The zone is never optional, because you
          cannot tell from the screen whether the reader is in it. And a second
          clock stops being a nicety: where the reader&rsquo;s zone differs from
          the venue&rsquo;s, show both, venue first.
        </p>
        <pre className='overflow-x-auto rounded-xl bg-subtle p-4 text-sm'>
          <code>{`// The viewer's zone is a client fact, so resolve it after mount
// rather than during render, where the server would disagree.
const viewer = useViewerTimeZone()

<DateTime at={startsAt} timeZone={venue.timeZone} timeStyle='long' />
{viewer && viewer !== venue.timeZone && (
  <span className='text-subtle'>
    <DateTime at={startsAt} timeZone={viewer} dateStyle='medium' timeStyle='medium' />
    {' your time'}
  </span>
)}`}</code>
        </pre>
        <Guideline
          title='Name the zone, never the record'
          description='An operator tool that prints an identifier or a raw offset is printing a database value, not copy.'
        >
          <Guideline.Do
            code={`Fri 27 Nov 2026, 7:30pm AWST\n27 Nov 2026, 9:30pm your time`}
          >
            The venue&rsquo;s clock first, because that is when the doors open.
            The reader&rsquo;s underneath, so nobody does the arithmetic.
          </Guideline.Do>
          <Guideline.Dont
            code={`27 Nov 2026 07:30 PM Australia/Perth\n27 Nov 2026, 07:30 PM (GMT+8)\n27 Nov 2026 07:30 PM`}
          >
            A database identifier. A raw offset. And a time with no zone at all,
            which is how an operator in one state sets an on sale for another
            and does not notice.
          </Guideline.Dont>
        </Guideline>
        <p className='max-w-prose text-subtle'>
          One thing must never happen here: an event time rendered in the
          reader&rsquo;s zone as the primary value. That is the wrong answer
          wearing the right label, and the most common way a scheduling mistake
          reaches a buyer.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          The Australian zones
        </h3>
        <p className='max-w-prose text-subtle'>
          Australia has five zones and only some states observe daylight saving.
          For half the year a show in Brisbane and a show in Sydney are an hour
          apart. For the other half they are not. That is why{' '}
          <code>timeZone</code> is required, and why it takes an{' '}
          <a
            href='https://www.iana.org/time-zones'
            target='_blank'
            rel='noreferrer'
            className='underline'
          >
            IANA identifier
          </a>{' '}
          rather than an abbreviation.
        </p>
        <Table
          head={['Abbreviation', 'Where', 'Daylight saving']}
          rows={ZONES}
          mono={1}
        />
        <p className='max-w-prose text-subtle'>
          Show the zone when the reader might not be in it. An event page for a
          national tour, an on-sale time, anything someone in another state acts
          on. Leave it off when the reader is obviously local, because it is
          noise.
        </p>
        <Guideline
          title='Name the zone, do not offset it'
          description='An abbreviation is what people recognise. A UTC offset is not.'
        >
          <Guideline.Do code={`On sale Fri 27 Nov, 9:00am AEDT`}>
            Someone in Perth knows to set an alarm for 6am.
          </Guideline.Do>
          <Guideline.Dont
            code={`On sale Fri 27 Nov, 9:00am GMT+11\nOn sale Fri 27 Nov, 9:00am Australia/Sydney`}
          >
            An offset nobody converts in their head. Or a raw IANA identifier,
            which is a database key, not copy.
          </Guideline.Dont>
        </Guideline>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Midnight, and the small hours
        </h3>
        <p className='max-w-prose text-subtle'>
          A late show is the normal case in this business, not an edge case. Two
          rules follow from that.
        </p>
        <p className='max-w-prose text-subtle'>
          First, a set that ends at or before 6am belongs to the night before. A
          show running 10pm to 3am is one night out, not two.{' '}
          <code>formatDurationDays</code> applies this, so a festival does not
          gain a day on one screen and not another.
        </p>
        <p className='max-w-prose text-subtle'>
          Second, <code>12:00am</code> is ambiguous to a lot of readers. In
          prose, prefer the word. In a table or a row of times, keep the digits
          so the column aligns.
        </p>
        <Guideline
          title='Say midnight when it is prose'
          description='The formatter emits digits, which is right for a table. A sentence is different.'
        >
          <Guideline.Do
            code={`Doors 8:00pm, close midnight\nSat 28 Nov, 12:00am`}
          >
            The word in a sentence. The digits in a row, where alignment is
            worth more.
          </Guideline.Do>
          <Guideline.Dont code={`Doors 8:00pm, close 12:00am\nCloses 12 pm`}>
            An ambiguous midnight in prose. And a <code>12 pm</code> that half
            of readers will take for midnight.
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Which register</h2>
        <p className='max-w-prose text-subtle'>
          <code>formatRelative</code> renders a timestamp as elapsed time. It
          falls back to the absolute date once the moment is further away than
          the cutoff, which defaults to seven days.
        </p>
        <pre className='overflow-x-auto rounded-xl bg-subtle p-4 text-sm'>
          <code>{`formatRelative(note.addedAt, { timeZone: viewerTimeZone() })
// → 'just now' · '3 minutes ago' · '5 hours ago'
// → 'yesterday' · '3 days ago'
// → 'Fri 27 Nov 2026' once it is past the cutoff`}</code>
        </pre>
        <Guideline
          title='Always keep the absolute reachable'
          description='A relative time cannot be checked against a calendar or quoted to anyone. Put the absolute in a title or tooltip.'
        >
          <Guideline.Do
            code={`<DateTime at={note.addedAt} timeZone={viewerTimeZone()} relative />`}
          >
            Scannable at a glance, precise on hover. The component puts the
            absolute in <code>title</code>, sets the machine value, and swaps
            the text in after mount so it neither goes stale nor mismatches the
            server.
          </Guideline.Do>
          <Guideline.Dont
            code={`<span>{formatRelative(at, o)}</span>\n<time dateTime={iso}>{formatRelative(at, o)}</time>`}
          >
            The exact moment is unreachable, and hand-rolled relative text is
            frozen at whatever the server rendered.
          </Guideline.Dont>
        </Guideline>
        <p className='max-w-prose text-subtle'>
          It reads the future too, so <code>in 20 minutes</code> works for a
          door opening. Not for the event itself: &ldquo;in 3 days&rdquo; is a
          worse answer than <code>Fri 27 Nov</code> for something a person has
          to turn up to.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          The ladder runs both ways
        </h3>
        <p className='max-w-prose text-subtle'>
          Past and future are not mirror images. For something that already
          happened, closer means relative is better. For something that has not
          happened yet, closer means relative is <em>worse</em>.
        </p>
        <p className='max-w-prose text-subtle'>
          &ldquo;3 minutes ago&rdquo; beats a timestamp on an audit row. But
          &ldquo;in 4 hours&rdquo; is a bad answer for a sale opening today,
          because you cannot set an alarm from it. As a future moment gets
          nearer, hand back the actual time.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Past: relative near, absolute far
        </h3>
        <p className='max-w-prose text-subtle'>
          This is what <code>formatRelative</code> does. The cutoff defaults to
          seven days.
        </p>
        <Table head={['Distance', 'Reads']} rows={PAST_LADDER} mono={1} />

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Future: absolute near, relative far
        </h3>
        <p className='max-w-prose text-subtle'>
          The inverse, and the formatter does not do it for you. Build it from
          the distance, the way an on-sale label does.
        </p>
        <Table head={['Distance', 'Reads', 'Why']} rows={FUTURE_LADDER} />

        <h3 className='mt-6 text-display-ui-5 text-strong'>Picking a cutoff</h3>
        <p className='max-w-prose text-subtle'>
          The default suits a note or an audit row. Shorten it where staleness
          matters, and do not reach for it at all where someone is making plans.
        </p>
        <Table head={['Surface', 'Cutoff', 'Why']} rows={CUTOFFS} />

        <Guideline
          title='Match the register to the decision'
          description='Ask what the reader does next. If the answer involves a calendar or an alarm, give them a date and a time.'
        >
          <Guideline.Do
            code={`Edited 3 minutes ago\nOn sale in 5 days\nOn sale tomorrow\nOn sale at 9:00am AEDT`}
          >
            The first is a recency check. The rest walk down to the exact time
            as the moment gets close enough to act on.
          </Guideline.Do>
          <Guideline.Dont
            code={`Edited 27 Nov 2026, 2:14:03pm\nOn sale in 4 hours\nStarts in 3 days\nOn sale in 63 days`}
          >
            A timestamp where recency was the question. A countdown where a time
            was needed. A countdown to the event itself. And a number nobody
            converts back into a date.
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Dates in data</h2>
        <p className='max-w-prose text-subtle'>
          Charts and dense tables are scanned and compared, not read. In prose a
          date is a fact in a sentence. In a column it is a value to line up
          against the ones above and below it.
        </p>
        <p className='max-w-prose text-subtle'>
          So the rules bend in one specific direction: fixed width, no
          decoration, and nothing that repeats what the surrounding structure
          already says.
        </p>
        <Table head={['Where', 'Use', 'Reads', 'Why']} rows={DATA_CONTEXTS} />

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          When the weekday is a dimension
        </h3>
        <p className='max-w-prose text-subtle'>
          A date in a column is usually a label: it says which row this is, and
          the reader is comparing the numbers beside it. There, the weekday is
          repetition and <code>medium</code> is right.
        </p>
        <p className='max-w-prose text-subtle'>
          Sometimes the weekday is the thing being compared. A promoter reading
          their events list wants to know whether Wednesdays sell worse than
          Fridays, and the only way to see that is to scan the weekday down the
          column against the figures. There it is an{' '}
          <strong>axis of the analysis</strong>. Dropping it removes the
          pattern.
        </p>
        <Guideline
          title='Ask whether the reader is comparing the weekday'
          description='The test is not how wide the column is. It is whether the answer to their question is in that token.'
        >
          <Guideline.Do
            code={`Events list      Fri 27 Nov 2026\nOrders table     27 Nov 2026\nSettlements      27 Nov 2026`}
          >
            The events list keeps the weekday because day of week drives
            attendance. The others do not, because nobody asks which weekday an
            order was placed.
          </Guideline.Do>
          <Guideline.Dont
            code={`Events list      27 Nov 2026\nOrders table     Fri 27 Nov 2026`}
          >
            The pattern removed from the one place it matters, and repetition
            added to a column where it says nothing.
          </Guideline.Dont>
        </Guideline>
        <p className='max-w-prose text-subtle'>
          When it is a dimension, keep it leading and abbreviated. Three
          characters in a fixed position is what lets the eye run down the
          column and catch the repetition. A weekday buried mid-string, or
          spelled out at varying widths, cannot be scanned that way.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          The axis and its tooltip are one design
        </h3>
        <p className='max-w-prose text-subtle'>
          An axis tick drops the weekday, the year and the meridiem because the
          axis range establishes all three and because dozens of ticks share the
          width of one chart. That is only safe because hovering restores them.
          Design the pair together or neither works.
        </p>
        <Guideline
          title='Let the tooltip carry what the tick cannot'
          description='A reader aims at a date, never at a two-pixel line. The tick orients; the tooltip answers.'
        >
          <Guideline.Do
            code={`tick:    27 Nov 19:30\ntooltip: Fri 27 Nov 2026, 7:30pm`}
          >
            The tick stays legible at density. The tooltip is the only place the
            full date needs to exist.
          </Guideline.Do>
          <Guideline.Dont
            code={`tick:    Fri 27 Nov 2026, 7:30pm\ntooltip: 27 Nov 19:30`}
          >
            A tick nobody can fit and a tooltip that answers less than the axis.
          </Guideline.Dont>
        </Guideline>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          24 hour, and only here
        </h3>
        <p className='max-w-prose text-subtle'>
          <code>numeric</code> is where rule 4 gives way for a reader, the way{' '}
          <code>iso</code> does for a file. A meridiem costs three characters on
          every tick, and worse, it changes width across midday, so{' '}
          <code>11:45am</code> and <code>12:00pm</code> crowd differently and a
          chart library starts dropping ticks unevenly.
        </p>
        <p className='max-w-prose text-subtle'>
          It also matches the source. Operators read a scan chart against a run
          sheet, and run sheets are 24 hour. A buyer should never meet this
          style.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Never key on a formatted date
        </h3>
        <p className='max-w-prose text-subtle'>
          Grouping, sorting, bucketing and caching key on the instant, never on
          the string that gets displayed. A formatted date is an output. The
          moment one is used as a key, changing how a date looks changes which
          rows group together, and that failure is silent.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Writing dates here</h2>
        <p className='max-w-prose text-subtle'>
          The scale is day first, never month first. <code>27 Nov 2026</code>,
          not <code>Nov 27, 2026</code>. This is not a preference. A month first
          date is read wrongly by most people here.
        </p>
        <Guideline
          title='Write dates the way people here read them'
          description='These follow from the scale. You only break them by hand rolling a date.'
        >
          <Guideline.Do code={`Fri 27 Nov 2026\n7:30pm\nAnzac Day, Boxing Day`}>
            Day first. No leading zero on the hour. Named days and public
            holidays are proper nouns, so they take capitals.
          </Guideline.Do>
          <Guideline.Dont code={`Nov 27, 2026\nFri 27th Nov\n07:30pm`}>
            Month first. Ordinals, which add nothing and are read aloud
            awkwardly. A padded hour, which belongs only to the two 24 hour
            styles, <code>numeric</code> and <code>iso</code>.
          </Guideline.Dont>
        </Guideline>

        <h3 className='mt-6 text-display-ui-5 text-strong'>Recurring events</h3>
        <p className='max-w-prose text-subtle'>
          Residencies, weekly nights and seasons all need plain words. Several
          common ones mean two different things to two different readers.
        </p>
        <Guideline
          title='Say the interval, not a word that hides it'
          description='If a word has two readings, a promoter and a buyer will pick different ones.'
        >
          <Guideline.Do
            code={`Every 2 weeks\nTwice a month\nThursdays, 5 Nov to 17 Dec`}
          >
            One reading only. The last one also bounds the run, which a
            recurring label on its own never does.
          </Guideline.Do>
          <Guideline.Dont code={`Fortnightly\nBimonthly\nBiannual`}>
            Each of these has two accepted meanings. None of them survive a
            refund conversation.
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Accessibility</h2>
        <p className='max-w-prose text-subtle'>
          Ranges need nothing extra. They are joined with the word{' '}
          <code>to</code>, so they read correctly on screen and out loud. A dash
          would not. Screen readers announce an en dash inconsistently and often
          skip it, which turns a range into one run on date.
        </p>
        <p className='max-w-prose text-subtle'>
          Seat runs are the exception and keep a hyphen. <code>A1-4</code> is a
          compressed list, not a range someone reads as a sentence, and{' '}
          <code>A1 to 4</code> would suggest four separate seats. The brand
          guide already spells number ranges this way, and it is the easier
          character to type.
        </p>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-prose-3 text-strong'>Outside React</h2>
        <p className='max-w-prose text-subtle'>
          The rules are portable. The implementation is not. There are two cases
          and they take different answers.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          JavaScript, but no React
        </h3>
        <p className='max-w-prose text-subtle'>
          Use the formatters. Each component page lists the ones behind it under{' '}
          <strong>Without React</strong>, with the call sites they are for:{' '}
          <Link href={DATE_TIME} className='underline'>
            DateTime
          </Link>
          ,{' '}
          <Link href='/components/duration' className='underline'>
            Duration
          </Link>
          ,{' '}
          <Link href='/components/countdown' className='underline'>
            Countdown
          </Link>{' '}
          and{' '}
          <Link href='/components/calendar-tile' className='underline'>
            CalendarTile
          </Link>
          . <code>formatMachine</code> gives you the attribute value, so there
          is no reason to build one by hand.
        </p>

        <h3 className='mt-6 text-display-ui-5 text-strong'>
          Another language on the server
        </h3>
        <p className='max-w-prose text-subtle'>
          The application owns its own formatter and follows the same rules,
          with the same style names. Name its methods after the style, never the
          format string they produce, so a call site cannot pick the wrong one.
        </p>
        <p className='max-w-prose text-subtle'>
          This is the only case that writes the <code>time</code> element by
          hand. The attribute is the machine value. Three shapes cover it.
        </p>
        <Table head={['Showing', 'datetime', 'Why']} rows={MACHINE_VALUES} />
        <Guideline
          title='Carry the offset whenever you show a time'
          description='A local time with no offset is a floating value. It parses to a different instant in every timezone that reads it.'
        >
          <Guideline.Do
            code={`datetime="2026-11-27T19:30:00+10:00"\ndatetime="2026-11-27"`}
          >
            The first identifies one instant anywhere on earth. The second is a
            calendar date, which genuinely has no zone.
          </Guideline.Do>
          <Guideline.Dont
            code={`datetime="2026-11-27 19:30"\ndatetime="Fri 27 Nov 2026, 7:30pm"`}
          >
            A floating local time, read ten hours out in London. And a human
            string, which is not a machine value at all.
          </Guideline.Dont>
        </Guideline>
        <p className='max-w-prose text-subtle'>
          Do not reuse the <code>iso</code> style here. It has no offset and
          uses a space rather than a <code>T</code>, which is right for a
          spreadsheet cell and wrong for this attribute. See{' '}
          <Link href={`${DATE_TIME}#without-react`} className='underline'>
            DateTime
          </Link>
          .
        </p>
        <p className='max-w-prose text-subtle'>
          Skip relative time on the server. It is stale the moment it is sent,
          and there is nothing to re-render it.
        </p>
      </section>
    </div>
  )
}
