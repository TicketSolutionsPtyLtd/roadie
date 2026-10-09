import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  describeDateRange,
  formatDateTime,
  formatMachine,
  formatTimeOfDay
} from '@oztix/roadie-core/datetime'

import {
  EXAMPLE_ZONE,
  ON_SALE_AT,
  RANGE_NOW,
  STARTS_AT,
  componentReads,
  dataFormatRows,
  dateStyleRows,
  machineValueRows,
  momentRows,
  pastLadderRows,
  resolvedWeekend,
  separatedRange,
  timeStyleRows
} from './example'

const page = readFileSync(
  new URL('../../app/foundations/date-and-time/page.mdx', import.meta.url),
  'utf8'
)

const readsOf = (rows: { name: string; reads: string[] }[], name: string) =>
  rows.find((row) => row.name === name)!.reads

// The page's own copy quotes what the formatters return. If an output
// changes, this fails until the copy says the same thing.
describe('Date and time copy', () => {
  it('quotes the show as the formatters spell it', () => {
    const [moment] = readsOf(componentReads(), '<DateTime>')
    const [range] = readsOf(componentReads(), '<DateTime to>')
    expect(page).toContain(`      ${moment}\n`)
    expect(page).toContain(`      ${range}\n`)
    expect(page).toContain(`      ${separatedRange()}\n`)
    expect(page).toContain(
      `      Doors ${readsOf(timeStyleRows(), 'medium')[0]}\n`
    )
  })

  it('quotes each style the way the scale renders it', () => {
    const [full, long, medium] = ['full', 'long', 'medium'].map(
      (style) => readsOf(dateStyleRows(), style)[0]
    )
    expect(page).toContain(`\`dateStyle: 'long'\` is \`${long}\``)
    expect(page).toContain(`Events list      ${long}`)
    expect(page).toContain(`Orders table     ${medium}`)
    expect(full).toBe('Friday, 27 November 2026')
    const [longTime] = readsOf(timeStyleRows(), 'long')
    const [, shortWithoutMinutes] = readsOf(timeStyleRows(), 'short')
    expect(page).toContain(`      ${longTime}\n`)
    expect(page).toContain(`      ${shortWithoutMinutes}   (short only)`)
  })

  it('quotes the on sale, the tick, and the tooltip as formatted', () => {
    const [access] = readsOf(momentRows(), 'Access time')
    const [tick, tooltip] = ['Axis tick', 'Tooltip'].map(
      (name) => readsOf(dataFormatRows(), name)[0]
    )
    expect(page).toContain(`On sale ${access}`)
    expect(page).toContain(`tick:    ${tick}\n      tooltip: ${tooltip}`)
  })

  it('converts the on sale and the late show for a reader elsewhere', () => {
    const perth = { timeZone: 'Australia/Perth', timeStyle: 'medium' } as const
    expect(page).toContain(
      `${formatTimeOfDay(ON_SALE_AT, perth)} your time\n\`\`\``
    )
    const perthShow = new Date('2026-11-27T11:30:00Z')
    expect(page).toContain(
      formatDateTime(perthShow, { ...perth, timeStyle: 'long' })!
    )
    expect(page).toContain(
      `${formatDateTime(perthShow, {
        timeZone: 'Australia/Brisbane',
        dateStyle: 'medium',
        timeStyle: 'medium'
      })} your time`
    )
    expect(page).toContain(
      `9:30pm your time, ${formatDateTime(new Date('2026-11-26T13:30:00Z'), {
        timeZone: 'Australia/Perth',
        context: 'standalone',
        now: RANGE_NOW
      })}`
    )
  })

  it('quotes the relative ladder as formatRelative returns it', () => {
    const ladder = pastLadderRows().flatMap(({ reads }) => reads)
    const quoted = page
      .split('formatRelative(note.addedAt')[1]!
      .split('```')[0]!
      .match(/'[^']+'/g)!
      .map((value) => value.slice(1, -1))
    expect(quoted).toEqual(ladder)
  })

  it('quotes month to date and this weekend as the range functions return them', () => {
    const { label, detail } = describeDateRange(
      { period: 'month', offset: 0, toDate: true },
      { now: RANGE_NOW, timeZone: EXAMPLE_ZONE }
    )
    expect(page).toContain(`${label}\n      tooltip: ${detail}`)
    const { start, end } = resolvedWeekend() as { start: string; end: string }
    expect(page).toContain(
      `// { kind: 'dates', start: '${start}', end: '${end}' }`
    )
  })

  it('quotes the datetime values formatMachine writes', () => {
    const [date, dateTime] = ['A date', 'A date and time'].map(
      (name) => readsOf(machineValueRows(), name)[0]
    )
    expect(page).toContain(`datetime="${dateTime}"\n      datetime="${date}"`)
    expect(formatMachine(STARTS_AT, { timeZone: EXAMPLE_ZONE })).toBe(date)
  })
})
