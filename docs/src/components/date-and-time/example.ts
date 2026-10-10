import {
  type Comparison,
  type DateRangeValue,
  type DateStyle,
  type FormatOptions,
  type TimeStyle,
  describeComparison,
  describeDateRange,
  formatCountdown,
  formatDateRange,
  formatDateTime,
  formatDuration,
  formatDurationDays,
  formatGlyph,
  formatMachine,
  formatRelative,
  formatTimeOfDay,
  joinWithFact,
  parseDatePhrase,
  resolveComparison,
  resolveDateRange
} from '@oztix/roadie-core/datetime'

import type { TwinCell, TwinTable } from '../../lib/twin-table'

// Fixed moments and a fixed zone, so every output reads the same on every build.
export const EXAMPLE_ZONE = 'Australia/Sydney'
/** A show at 7:30pm on Fri 27 Nov 2026 in Sydney. */
export const STARTS_AT = new Date('2026-11-27T08:30:00Z')
export const DOORS_AT = new Date('2026-11-27T08:00:00Z')
export const ENDS_AT = new Date('2026-11-29T08:30:00Z')
/** On sale at 9:00am Sydney time on the day of the show. */
export const ON_SALE_AT = new Date('2026-11-26T22:00:00Z')
export const ORDER_PLACED_AT = new Date('2026-11-27T03:14:00Z')
/** 5:00am on the day of the show, for the relative ladders. */
export const LADDER_NOW = new Date('2026-11-26T18:00:00Z')
/** 10:00am on Fri 2 Oct 2026, for the ranges and phrases. */
export const RANGE_NOW = new Date('2026-10-02T00:00:00Z')

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const zoned = (options: Omit<FormatOptions, 'timeZone'> = {}) => ({
  timeZone: EXAMPLE_ZONE,
  now: RANGE_NOW,
  ...options
})

const text = (value: string | null) => {
  if (value === null) throw new Error('A formatter returned null.')
  return value
}

export type Row = { name: string; reads: string[] }

export function componentReads(): Row[] {
  const glyph = formatGlyph(STARTS_AT, zoned())!
  return [
    {
      name: '<DateTime>',
      reads: [text(formatDateTime(STARTS_AT, zoned({ timeStyle: 'medium' })))]
    },
    {
      name: '<DateTime relative>',
      reads: [
        text(
          formatRelative(new Date(+LADDER_NOW - 3 * MINUTE), {
            timeZone: EXAMPLE_ZONE,
            now: LADDER_NOW
          })
        )
      ]
    },
    {
      name: '<DateTime to>',
      reads: [text(formatDateRange(STARTS_AT, ENDS_AT, zoned()))]
    },
    { name: '<Duration>', reads: [text(formatDuration(150 * MINUTE))] },
    { name: '<Countdown>', reads: [text(formatCountdown(272_000))] },
    { name: '<CalendarTile>', reads: [`${glyph.month} ${glyph.day}`] },
    {
      name: '<DateTime render>',
      reads: [
        text(
          formatDateTime(
            STARTS_AT,
            zoned({ dateStyle: 'short', timeStyle: 'numeric' })
          )
        )
      ]
    }
  ]
}

const DATE_STYLES: DateStyle[] = ['full', 'long', 'medium', 'short', 'iso']
const TIME_STYLES: TimeStyle[] = ['long', 'medium', 'short', 'numeric']

export function dateStyleRows(): Row[] {
  return DATE_STYLES.map((dateStyle) => ({
    name: dateStyle,
    reads: [text(formatDateTime(STARTS_AT, zoned({ dateStyle })))]
  }))
}

/** `short` shows two times, since it drops only zero minutes. */
export function timeStyleRows(): Row[] {
  return TIME_STYLES.map((timeStyle) => {
    const times = timeStyle === 'short' ? [STARTS_AT, DOORS_AT] : [STARTS_AT]
    return {
      name: timeStyle,
      reads: times.map((at) => text(formatTimeOfDay(at, zoned({ timeStyle }))))
    }
  })
}

export function momentRows(): Row[] {
  return [
    {
      name: 'Event time',
      reads: [text(formatDateTime(STARTS_AT, zoned({ timeStyle: 'medium' })))]
    },
    {
      name: 'Access time',
      reads: [
        text(
          formatDateTime(
            ON_SALE_AT,
            zoned({ timeStyle: 'long', context: 'standalone' })
          )
        )
      ]
    },
    {
      name: 'Timestamp',
      reads: [
        text(
          formatDateTime(
            ORDER_PLACED_AT,
            zoned({ dateStyle: 'medium', timeStyle: 'medium' })
          )
        )
      ]
    }
  ]
}

const relative = (offset: number) =>
  text(
    formatRelative(new Date(+LADDER_NOW + offset), {
      timeZone: EXAMPLE_ZONE,
      now: LADDER_NOW
    })
  )

export function pastLadderRows(): Row[] {
  return [
    { name: 'Under a minute', reads: [relative(-30_000)] },
    { name: 'Under an hour', reads: [relative(-3 * MINUTE)] },
    { name: 'Under a day', reads: [relative(-5 * HOUR)] },
    { name: 'One day', reads: [relative(-DAY)] },
    { name: 'Under a week', reads: [relative(-3 * DAY)] },
    { name: 'Older', reads: [relative(-10 * DAY)] }
  ]
}

/** The inverse ladder, built from the distance as the page says to. */
export function futureLadderRows(): Row[] {
  const inTenDays = new Date(+LADDER_NOW + 10 * DAY)
  return [
    {
      name: 'Over a week',
      reads: [
        text(
          formatDateTime(inTenDays, {
            timeZone: EXAMPLE_ZONE,
            now: LADDER_NOW
          })
        )
      ]
    },
    { name: 'Under a week', reads: [relative(5 * DAY)] },
    { name: 'One day', reads: [relative(DAY)] },
    {
      name: 'Today',
      reads: [text(formatTimeOfDay(ON_SALE_AT, zoned({ timeStyle: 'long' })))]
    }
  ]
}

export function dataFormatRows(): Row[] {
  const rows: [string, Omit<FormatOptions, 'timeZone'>][] = [
    ['Axis tick', { dateStyle: 'short', timeStyle: 'numeric' }],
    ['Tooltip', { dateStyle: 'long', timeStyle: 'medium' }],
    ['Table column, date identifies the row', { dateStyle: 'medium' }],
    ['Table column, weekday is a variable', { dateStyle: 'long' }],
    ['Table column, with time', { dateStyle: 'medium', timeStyle: 'numeric' }],
    ['Export cell', { dateStyle: 'iso', timeStyle: 'numeric' }]
  ]
  return rows.map(([name, options]) => ({
    name,
    reads: [text(formatDateTime(STARTS_AT, zoned(options)))]
  }))
}

/** A Brisbane show at 7:30pm, so the offset is the same all year. */
export function machineValueRows(): Row[] {
  const at = new Date('2026-11-27T09:30:00Z')
  const brisbane = { timeZone: 'Australia/Brisbane' }
  return [
    { name: 'A date', reads: [text(formatMachine(at, brisbane))] },
    {
      name: 'A date and time',
      reads: [text(formatMachine(at, { ...brisbane, timeStyle: 'medium' }))]
    },
    {
      name: 'A time only',
      reads: [text(formatTimeOfDay(at, { ...brisbane, timeStyle: 'numeric' }))]
    }
  ]
}

export const separatedRange = () =>
  joinWithFact(
    text(formatDateTime(STARTS_AT, zoned())),
    formatDurationDays(STARTS_AT, ENDS_AT, zoned())
  )

const ZONES = [
  ['Australia/Sydney', 'NSW, VIC, TAS, ACT'],
  ['Australia/Brisbane', 'QLD'],
  ['Australia/Adelaide', 'SA'],
  ['Australia/Darwin', 'NT'],
  ['Australia/Perth', 'WA'],
  ['Australia/Lord_Howe', 'Lord Howe Island']
] as const

const WINTER = new Date('2026-07-01T00:00:00Z')
const SUMMER = new Date('2026-12-01T00:00:00Z')

function zoneName(
  at: Date,
  timeZone: string,
  timeZoneName: 'short' | 'longOffset'
) {
  return new Intl.DateTimeFormat('en-AU', { timeZone, timeZoneName })
    .formatToParts(at)
    .find((part) => part.type === 'timeZoneName')!.value
}

function offsetMinutes(at: Date, timeZone: string) {
  const [, sign, hours, minutes] = /GMT([+-])(\d{2}):(\d{2})/.exec(
    zoneName(at, timeZone, 'longOffset')
  )!
  return (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes))
}

export type ZoneRow = {
  abbreviation: string
  where: string
  daylightSaving: string
}

/** Each zone's abbreviation in winter and summer, as `timeStyle: 'long'` prints it. */
export function zoneRows(): ZoneRow[] {
  return ZONES.map(([timeZone, where]) => {
    const winter = text(
      formatTimeOfDay(WINTER, { timeZone, timeStyle: 'long' })
    )
    const summer = text(
      formatTimeOfDay(SUMMER, { timeZone, timeStyle: 'long' })
    )
    const [standard, daylight] = [winter, summer].map((time) =>
      time.split(' ').at(-1)!
    )
    const shift =
      offsetMinutes(SUMMER, timeZone) - offsetMinutes(WINTER, timeZone)
    return {
      abbreviation:
        standard === daylight ? standard! : `${standard} / ${daylight}`,
      where,
      daylightSaving:
        shift === 0
          ? 'No daylight saving'
          : shift === 60
            ? 'Observes daylight saving'
            : `Shifts ${shift} minutes for daylight saving`
    }
  })
}

const RANGE_OPTIONS = { now: RANGE_NOW, timeZone: EXAMPLE_ZONE }

export const RELATIVE_RANGES: [string, DateRangeValue][] = [
  ["'today'", 'today'],
  ["'this-week'", 'this-week'],
  ["'this-weekend'", 'this-weekend'],
  ["'next-week'", 'next-week'],
  [
    "{ direction: 'next', amount: 7, unit: 'day' }",
    { direction: 'next', amount: 7, unit: 'day' }
  ],
  [
    "{ direction: 'past', amount: 30, unit: 'day' }",
    { direction: 'past', amount: 30, unit: 'day' }
  ],
  [
    "{ direction: 'next', amount: 3, unit: 'hour' }",
    { direction: 'next', amount: 3, unit: 'hour' }
  ],
  [
    "{ period: 'month', offset: 0, toDate: true }",
    { period: 'month', offset: 0, toDate: true }
  ],
  ["{ period: 'quarter', offset: -1 }", { period: 'quarter', offset: -1 }],
  [
    "{ period: 'year', offset: 0, fiscal: true }",
    { period: 'year', offset: 0, fiscal: true }
  ],
  ["'upcoming'", 'upcoming'],
  ["'ongoing'", 'ongoing']
]

export function rangeRows() {
  return RELATIVE_RANGES.map(([code, value]) => ({
    code,
    ...describeDateRange(value, RANGE_OPTIONS)
  }))
}

const COMPARED: DateRangeValue = { period: 'month', offset: 0, toDate: true }

const COMPARISONS: [string, Comparison][] = [
  ["'previous-period'", 'previous-period'],
  ["'previous-year'", 'previous-year'],
  [
    "{ start: '2026-09-01', end: '2026-09-02' }",
    { start: '2026-09-01', end: '2026-09-02' }
  ]
]

export function comparisonRows() {
  return COMPARISONS.map(([code, comparison]) => {
    const { range } = resolveComparison(COMPARED, comparison, RANGE_OPTIONS)
    if (range?.kind !== 'dates') throw new Error(`${code} has no dates.`)
    return {
      code,
      context: describeComparison(comparison),
      covers: describeDateRange(
        { start: range.start, end: range.end },
        RANGE_OPTIONS
      ).detail
    }
  })
}

export const PHRASES = [
  'this weekend',
  'next 7 days',
  'fortnight',
  'next weekend',
  'fri',
  'in 2 weeks',
  'end of month',
  '14 mar',
  '1/12',
  'after 1 dec',
  'between 1 and 14 mar',
  'last quarter',
  'this financial year',
  '7:30pm'
]

export function phraseRows() {
  return PHRASES.map((typed) => ({
    typed,
    suggests: parseDatePhrase(typed, RANGE_OPTIONS).map(({ label }) => label)
  }))
}

export function resolvedWeekend() {
  return resolveDateRange('this-weekend', RANGE_OPTIONS)
}

const code = (value: string): TwinCell => [{ code: value }]

/** Each value in code, joined by "and". */
const reads = (values: string[]): TwinCell =>
  values.flatMap((value, index) =>
    index > 0 ? [' and ', { code: value }] : [{ code: value }]
  )

const readsTable = (
  head: [string, string],
  rows: Row[],
  codeNames = false
): TwinTable => ({
  head,
  rows: rows.map(({ name, reads: values }) => [
    codeNames ? code(name) : name,
    reads(values)
  ])
})

/** The Date and time page's tables, built once for the page and its markdown twin. */
export const DATE_TIME_TABLES = {
  ComparisonTable: (): TwinTable => ({
    head: ['Comparison', 'Context line', 'Covers'],
    rows: comparisonRows().map((row) => [
      code(row.code),
      row.context,
      row.covers
    ])
  }),
  ComponentReads: () =>
    readsTable(['Component', 'Reads'], componentReads(), true),
  DataFormatReads: () => readsTable(['Where', 'Reads'], dataFormatRows()),
  DateStyleScale: () => readsTable(['Style', 'Renders'], dateStyleRows(), true),
  MachineValueReads: () =>
    readsTable(['Showing', 'datetime'], machineValueRows()),
  MomentReads: () => readsTable(['Kind', 'Looks like'], momentRows()),
  PhraseTable: (): TwinTable => ({
    head: ['Typed', 'Suggests'],
    rows: phraseRows().map(({ typed, suggests }) => [
      code(typed),
      suggests.join(' or ')
    ])
  }),
  RangeTable: (): TwinTable => ({
    head: ['Value', 'Label', 'Covers'],
    rows: rangeRows().map((row) => [code(row.code), row.label, row.detail])
  }),
  RelativeLadder: (direction: 'past' | 'future') =>
    readsTable(
      ['Distance', 'Reads'],
      direction === 'past' ? pastLadderRows() : futureLadderRows()
    ),
  TimeStyleScale: () => readsTable(['Style', 'Renders'], timeStyleRows(), true),
  ZoneTable: (): TwinTable => ({
    head: ['Abbreviation', 'Where', 'Daylight saving'],
    rows: zoneRows().map((row) => [
      code(row.abbreviation),
      row.where,
      row.daylightSaving
    ])
  })
}
