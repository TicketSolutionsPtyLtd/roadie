import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Browser, type Page, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { BASE_PATH, ORIGIN, serveExport } from './serveExport'

let browser: Browser

beforeAll(async () => {
  const engines = { chromium, firefox, webkit }
  const engine = (process.env.E2E_BROWSER ?? 'chromium') as keyof typeof engines
  browser = await engines[engine].launch()
})

afterAll(async () => {
  await browser?.close()
})

afterEach(async () => {
  await Promise.all(browser.contexts().map((context) => context.close()))
})

async function open(width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/date-and-time/`)
  await page.waitForLoadState('networkidle')
  return page
}

/** Each body row of a docs table, as its cells' text. */
async function rowsOf(page: Page, slot: string) {
  const rows = page.locator(`[data-slot=${slot}] tbody tr`)
  return rows.evaluateAll((trs) =>
    trs.map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent!.trim())
    )
  )
}

describe('Date and time foundation', () => {
  it('shows a 7:30pm Friday show in Sydney in every date and time style', async () => {
    const page = await open()
    expect(await rowsOf(page, 'date-style-scale')).toEqual([
      ['full', 'Friday, 27 November 2026'],
      ['long', 'Fri 27 Nov 2026'],
      ['medium', '27 Nov 2026'],
      ['short', '27 Nov'],
      ['iso', '2026-11-27']
    ])
    expect(await rowsOf(page, 'time-style-scale')).toEqual([
      ['long', '7:30pm AEDT'],
      ['medium', '7:30pm'],
      ['short', '7:30pm and 7pm'],
      ['numeric', '19:30']
    ])
    expect(await rowsOf(page, 'component-reads')).toEqual([
      ['<DateTime>', 'Fri 27 Nov 2026, 7:30pm'],
      ['<DateTime relative>', '3 minutes ago'],
      ['<DateTime to>', 'Fri 27 to Sun 29 Nov 2026'],
      ['<Duration>', '2 hours 30 minutes'],
      ['<Countdown>', '4:32'],
      ['<CalendarTile>', 'NOV 27'],
      ['<DateTime render>', '27 Nov 19:30']
    ])
    expect(await rowsOf(page, 'moment-reads')).toEqual([
      ['Event time', 'Fri 27 Nov 2026, 7:30pm'],
      ['Access time', 'Fri 27 Nov, 9:00am AEDT'],
      ['Timestamp', '27 Nov 2026, 2:14pm']
    ])
  }, 60_000)

  it('walks the relative ladder in both directions from 5am on the day', async () => {
    const page = await open()
    expect(await rowsOf(page, 'past-ladder')).toEqual([
      ['Under a minute', 'just now'],
      ['Under an hour', '3 minutes ago'],
      ['Under a day', '5 hours ago'],
      ['One day', 'yesterday'],
      ['Under a week', '3 days ago'],
      ['Older', 'Tue 17 Nov 2026']
    ])
    expect(await rowsOf(page, 'future-ladder')).toEqual([
      ['Over a week', 'Mon 7 Dec 2026'],
      ['Under a week', 'in 5 days'],
      ['One day', 'tomorrow'],
      ['Today', '9:00am AEDT']
    ])
  }, 60_000)

  it('formats data contexts, machine values, and zones', async () => {
    const page = await open()
    expect(await rowsOf(page, 'data-format-reads')).toEqual([
      ['Axis tick', '27 Nov 19:30'],
      ['Tooltip', 'Fri 27 Nov 2026, 7:30pm'],
      ['Table column, date identifies the row', '27 Nov 2026'],
      ['Table column, weekday is a variable', 'Fri 27 Nov 2026'],
      ['Table column, with time', '27 Nov 2026 19:30'],
      ['Export cell', '2026-11-27 19:30']
    ])
    expect(await rowsOf(page, 'machine-value-reads')).toEqual([
      ['A date', '2026-11-27'],
      ['A date and time', '2026-11-27T19:30:00+10:00'],
      ['A time only', '19:30']
    ])
    expect(await rowsOf(page, 'zone-table')).toEqual([
      ['AEST / AEDT', 'NSW, VIC, TAS, ACT', 'Observes daylight saving'],
      ['AEST', 'QLD', 'No daylight saving'],
      ['ACST / ACDT', 'SA', 'Observes daylight saving'],
      ['ACST', 'NT', 'No daylight saving'],
      ['AWST', 'WA', 'No daylight saving'],
      [
        'LHST / LHDT',
        'Lord Howe Island',
        'Shifts 30 minutes for daylight saving'
      ]
    ])
  }, 60_000)

  it('works out ranges, comparisons, and phrases on Fri 2 Oct 2026 at 10am in Sydney', async () => {
    const page = await open()
    const ranges = await rowsOf(page, 'range-table')
    expect(ranges).toHaveLength(12)
    expect(ranges).toContainEqual([
      "'this-week'",
      'This week',
      '28 Sept to 4 Oct 2026'
    ])
    expect(ranges).toContainEqual([
      "'this-weekend'",
      'This weekend',
      '3 to 4 Oct 2026'
    ])
    expect(ranges).toContainEqual([
      "{ direction: 'next', amount: 7, unit: 'day' }",
      'Next 7 days',
      '2 to 8 Oct 2026'
    ])
    expect(ranges).toContainEqual([
      "{ period: 'year', offset: 0, fiscal: true }",
      'This financial year',
      '1 Jul 2026 to 30 Jun 2027'
    ])
    expect(await rowsOf(page, 'comparison-table')).toEqual([
      ["'previous-period'", 'vs previous period', '1 to 2 Sept 2026'],
      ["'previous-year'", 'vs previous year', '1 to 2 Oct 2025'],
      [
        "{ start: '2026-09-01', end: '2026-09-02' }",
        'vs 1 to 2 Sept 2026',
        '1 to 2 Sept 2026'
      ]
    ])
    const phrases = await rowsOf(page, 'phrase-table')
    expect(phrases).toContainEqual(['fortnight', 'Next 14 days'])
    expect(phrases).toContainEqual([
      'next weekend',
      '10 to 11 Oct 2026 or This weekend'
    ])
    expect(phrases).toContainEqual(['1/12', 'Tue 1 Dec 2026'])
    expect(phrases).toContainEqual(['14 mar', 'Sun 14 Mar 2027'])
  }, 60_000)

  it('fits a phone without scrolling sideways', async () => {
    const page = await open(375)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBe(0)
  }, 60_000)

  it('describes each output in its markdown copy without pointing at what it drops', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/date-and-time.md'),
      'utf-8'
    )
    // One sentence per docs component, since each drops out of the copy.
    expect(markdown.match(/On the\s+docs\s+site/g)).toHaveLength(12)
    // A column's neighbours are prose, not a pointer at a dropped component.
    expect(markdown.replace('above and below it', '')).not.toMatch(
      /\b(below|above)\b/i
    )
  }, 60_000)
})
