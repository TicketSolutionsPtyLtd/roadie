import { StrictMode, useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import type { DateRangeValue } from '@oztix/roadie-core/datetime'

import { DateRangePicker } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames } from '../../css/testUtils'
import { settledBox, tapOn as tapAt } from '../../utils/touchTestUtils'
import { useStylesheet } from '../Pane/testUtils'

const TIMEOUT = { timeout: 20_000 }

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// A swipe's fling carries on after the finger lifts; waits for it to stop.
async function scrollRests(scroller: Element) {
  let last = -1
  await expect
    .poll(async () => {
      const before = last
      await nudgeFrames()
      last = scroller.scrollTop
      return last === before
    })
    .toBe(true)
}
const box = (element: Element) => element.getBoundingClientRect()
const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!

const tapOn = (element: Element) => tapAt(element, 'centre')

function Period() {
  const [value, setValue] = useState<DateRangeValue | null>(null)
  return (
    <DateRangePicker
      aria-label='Sales period'
      today='2026-10-07'
      commit='apply'
      value={value}
      onValueChange={setValue}
    />
  )
}

describe('DateRangePicker tapped on a phone', TIMEOUT, () => {
  it('ends a range in a month swiped to', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Period />)
    await tapOn(screen.getByRole('button', { name: /^Choose dates/ }))
    const drawer = await screen.findByRole('dialog')
    await settledBox(drawer)
    await tapOn(day('2026-10-01'))
    const body = drawer.querySelector('[data-slot="drawer-body"]')!
    const x = window.innerWidth / 2
    for (
      let swipes = 0;
      swipes < 10 && box(day('2026-11-05')).bottom > window.innerHeight - 150;
      swipes++
    ) {
      const from = window.innerHeight - 200
      await commands.swipe({ x, y: from }, { x, y: from - 120 })
      await scrollRests(body)
    }
    await tapOn(day('2026-11-05'))
    const summary = drawer.querySelector(
      '[data-slot="date-range-picker-summary"]'
    )!
    expect(summary.textContent!.replace(/\s+/g, ' ')).toMatch(
      /^1 Oct to 5 Nov 2026 · 36 days$/
    )
  })

  it('ends a range on the next page of a popover', async () => {
    await page.viewport(900, 900)
    render(<Period />)
    await tapOn(screen.getByRole('button', { name: /^Choose dates/ }))
    const popup = await screen.findByRole('dialog')
    await tapOn(day('2026-10-01'))
    await tapOn(within(popup).getByRole('button', { name: 'Next month' }))
    // The page turns after its slide out.
    await expect.poll(() => popup.querySelector('[data-swiping]')).toBeNull()
    await tapOn(day('2026-11-05'))
    expect(within(popup).getByRole('combobox', { name: 'End' })).toHaveValue(
      '5 Nov 2026'
    )
    await page.viewport(390, 844)
  })

  it('opens the Calendar tab on the chosen month', async () => {
    function Last30() {
      return (
        <DateRangePicker
          aria-label='Sales period'
          today='2026-10-07'
          defaultValue={{ direction: 'past', amount: 30, unit: 'day' }}
        />
      )
    }
    // Strict, as in development, and with the panels' transitions left on.
    render(
      <StrictMode>
        <Last30 />
      </StrictMode>
    )
    await tapOn(screen.getByRole('button', { name: /^Choose dates/ }))
    const drawer = await screen.findByRole('dialog')
    await settledBox(drawer)
    await tapOn(within(drawer).getByRole('tab', { name: 'Calendar' }))
    await expect
      .poll(() => {
        const weekdays = drawer.querySelector('[data-slot="calendar-weekdays"]')
        const september = drawer.querySelector('[data-month="2026-09-01"]')
        return weekdays && september
          ? Math.abs(box(september).top - box(weekdays).bottom)
          : Infinity
      })
      .toBeLessThan(2)
  })

  it('ends a range in a month scrolled to', async () => {
    render(<Period />)
    await tapOn(screen.getByRole('button', { name: /^Choose dates/ }))
    const drawer = await screen.findByRole('dialog')
    await settledBox(drawer)
    await tapOn(day('2026-10-01'))
    const body = drawer.querySelector<HTMLElement>('[data-slot="drawer-body"]')!
    const weekdays = drawer.querySelector('[data-slot="calendar-weekdays"]')!
    const november = drawer.querySelector('[data-month="2026-11-01"]')!
    body.scrollTop += box(november).top - box(weekdays).bottom
    // The calendar follows the scroll a frame after its scroll event.
    await nudgeFrames()
    await tapOn(day('2026-11-05'))
    const summary = drawer.querySelector(
      '[data-slot="date-range-picker-summary"]'
    )!
    expect(summary.textContent!.replace(/\s+/g, ' ')).toMatch(
      /^1 Oct to 5 Nov 2026 · 36 days$/
    )
    expect(within(drawer).getByRole('combobox', { name: 'End' })).toHaveValue(
      '5 Nov 2026'
    )
  })
})
