import { StrictMode, useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import type { DateRangeValue } from '@oztix/roadie-core/datetime'

import { DateRangePicker } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

const TIMEOUT = { timeout: 20_000 }

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))
const box = (element: Element) => element.getBoundingClientRect()
const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!

async function tapOn(element: Element) {
  await settle()
  const { left, top, width, height } = box(element)
  await commands.tap(left + width / 2, top + height / 2)
  await settle(200)
}

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
    await settle(600)
    await tapOn(day('2026-10-01'))
    const x = window.innerWidth / 2
    for (
      let swipes = 0;
      swipes < 10 && box(day('2026-11-05')).bottom > window.innerHeight - 150;
      swipes++
    ) {
      const from = window.innerHeight - 200
      await commands.swipe({ x, y: from }, { x, y: from - 120 })
      await settle(400)
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
    await settle(600)
    await tapOn(within(drawer).getByRole('tab', { name: 'Calendar' }))
    await settle(600)
    const weekdays = drawer.querySelector('[data-slot="calendar-weekdays"]')!
    const september = drawer.querySelector('[data-month="2026-09-01"]')!
    expect(Math.abs(box(september).top - box(weekdays).bottom)).toBeLessThan(2)
  })

  it('ends a range in a month scrolled to', async () => {
    render(<Period />)
    await tapOn(screen.getByRole('button', { name: /^Choose dates/ }))
    const drawer = await screen.findByRole('dialog')
    await settle(600)
    await tapOn(day('2026-10-01'))
    const body = drawer.querySelector<HTMLElement>('[data-slot="drawer-body"]')!
    const weekdays = drawer.querySelector('[data-slot="calendar-weekdays"]')!
    const november = drawer.querySelector('[data-month="2026-11-01"]')!
    body.scrollTop += box(november).top - box(weekdays).bottom
    await settle()
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
