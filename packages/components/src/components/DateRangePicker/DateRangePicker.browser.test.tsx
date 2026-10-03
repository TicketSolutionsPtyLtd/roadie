import { StrictMode, useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import type { DateRangeValue } from '@oztix/roadie-core/datetime'

import { DateRangePicker } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { Field } from '../Field'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'
// Wed 7 Oct 2026.
const TODAY = '2026-10-07'
const TIMEOUT = { timeout: 15_000 }

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(async () => {
  setHoverCapable(true)
  cleanup()
  await commands.parkPointer()
})

const trigger = () => screen.getByRole('button', { name: /^Choose dates/ })
const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!
const months = () =>
  document.querySelectorAll('[data-slot="calendar-month"]').length
const box = (element: Element) => element.getBoundingClientRect()
const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

function Period({
  initial = 'last-week' as DateRangeValue | null,
  commit
}: {
  initial?: DateRangeValue | null
  commit?: 'immediate' | 'apply'
}) {
  const [value, setValue] = useState(initial)
  return (
    <div className='grid gap-2 p-4'>
      <Field>
        <Field.Label>Sales period</Field.Label>
        <DateRangePicker
          today={TODAY}
          commit={commit}
          value={value}
          onValueChange={setValue}
          className='w-fit'
        />
      </Field>
      <output>{JSON.stringify(value)}</output>
    </div>
  )
}

describe('DateRangePicker on a wide screen', TIMEOUT, () => {
  beforeAll(() => page.viewport(1440, 900))
  afterAll(() => page.viewport(1920, 1080))

  it('shows two months beside the presets', async () => {
    render(<Period />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    await expect.poll(months).toBe(2)
    const presets = within(popup).getByRole('group', { name: 'Presets' })
    const calendar = popup.querySelector('[data-slot="calendar"]')!
    expect(box(presets).right).toBeLessThanOrEqual(box(calendar).left)
    const [first, second] = popup.querySelectorAll(
      '[data-slot="calendar-month"]'
    )
    expect(box(first!).top).toBe(box(second!).top)
    expect(box(popup).right).toBeLessThanOrEqual(window.innerWidth)
  })

  it('keeps its 280px months and 40px days at 1280px', async () => {
    await page.viewport(1280, 900)
    render(<Period />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    expect(popup).not.toHaveAttribute('data-slot', 'drawer-popup')
    await expect.poll(months).toBe(2)
    const [first, second] = Array.from(
      popup.querySelectorAll('[data-slot="calendar-month"]'),
      box
    )
    expect(first!.width).toBe(280)
    expect(second!.width).toBe(280)
    expect(second!.top).toBe(first!.top)
    expect(box(day('2026-10-12')).width).toBe(40)
    expect(within(popup).queryByRole('tab')).toBeNull()
    await page.viewport(1440, 900)
  })

  it('opens on the chosen preset and closes back to the trigger', async () => {
    render(<Period />)
    trigger().focus()
    await userEvent.keyboard('{Enter}')
    await expect
      .poll(() => document.activeElement?.textContent)
      .toBe('Last week')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => document.activeElement).toBe(trigger())
  })

  it('closes only the suggestions on Escape in the popover', async () => {
    render(<Period initial={null} />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    const start = within(popup).getByRole('combobox', { name: 'Start' })
    await userEvent.click(start)
    await userEvent.type(start, 'tom')
    await screen.findByRole('listbox')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('dialog')).toBe(popup)
    expect(start).toHaveValue('tom')
  })

  it('fills the chosen preset and leaves the others quiet', async () => {
    render(<Period />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    const chosen = within(popup).getByRole('button', { name: 'Last week' })
    const other = within(popup).getByRole('button', { name: 'Last month' })
    expect(getComputedStyle(chosen).backgroundColor).not.toBe(
      getComputedStyle(other).backgroundColor
    )
  })

  it('previews the range under the pointer, then applies it', async () => {
    render(<Period commit='apply' initial={null} />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    await userEvent.click(day('2026-10-12'))
    await userEvent.hover(day('2026-10-15'))
    await expect
      .poll(() => day('2026-10-14').hasAttribute('data-range-preview'))
      .toBe(true)
    await userEvent.click(day('2026-10-15'))
    await userEvent.click(within(popup).getByRole('button', { name: 'Apply' }))
    await expect
      .poll(() => document.querySelector('output')!.textContent)
      .toBe('{"start":"2026-10-12","end":"2026-10-15"}')
  })
})

describe('DateRangePicker closed by a click outside', TIMEOUT, () => {
  it('drops a half-typed date rather than keeping it for later', async () => {
    function Outside() {
      const [value, setValue] = useState<DateRangeValue | null>({
        start: '2026-10-10',
        end: '2026-10-12'
      })
      return (
        <div className='grid gap-2 p-4'>
          <DateRangePicker
            aria-label='Period'
            commit='apply'
            today={TODAY}
            value={value}
            onValueChange={setValue}
            className='w-fit'
          />
          <button type='button' onClick={() => setValue('yesterday')}>
            Outside
          </button>
        </div>
      )
    }
    render(<Outside />)
    await userEvent.click(trigger())
    let popup = await screen.findByRole('dialog')
    const start = within(popup).getByRole('combobox', { name: 'Start' })
    await userEvent.clear(start)
    await userEvent.type(start, '1 oct')
    // The open suggestions hide the rest of the page from the tree.
    await userEvent.click(
      screen.getByRole('button', { name: 'Outside', hidden: true })
    )
    await expect
      .poll(() => trigger().getAttribute('aria-expanded'))
      .toBe('false')
    await userEvent.click(trigger())
    popup = await screen.findByRole('dialog')
    expect(
      within(popup).getByRole('button', { name: 'Yesterday' })
    ).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('DateRangePicker closed with text half typed', TIMEOUT, () => {
  it('commits the text on the way out, as a field does on blur', async () => {
    render(<Period initial={{ start: '2026-10-10', end: '2026-10-12' }} />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    const start = within(popup).getByRole('combobox', { name: 'Start' })
    await userEvent.clear(start)
    await userEvent.type(start, '1 oct')
    await userEvent.click(document.querySelector('output')!)
    await expect
      .poll(() => trigger().getAttribute('aria-expanded'))
      .toBe('false')
    expect(document.querySelector('output')).toHaveTextContent(
      '{"start":"2026-10-01","end":"2026-10-12"}'
    )
  })
})

const tab = (name: string) => screen.getByRole('tab', { name })
const summary = (drawer: Element) =>
  drawer.querySelector('[data-slot="date-range-picker-summary"]')!
// WebKit's dates say "Sep" where the others say "Sept".
const textOf = (element: Element) =>
  element.textContent!.replace(/\s+/g, ' ').trim()
const footerOf = (drawer: Element) =>
  drawer.querySelector<HTMLElement>('[data-slot="drawer-footer"]')!
const bodyOf = (drawer: Element) =>
  drawer.querySelector<HTMLElement>('[data-slot="drawer-body"]')!

for (const [width, height] of [
  [390, 844],
  [360, 740]
] as const) {
  describe(`DateRangePicker on a ${width}px phone`, TIMEOUT, () => {
    beforeAll(() => page.viewport(width, height))
    afterAll(() => page.viewport(1920, 1080))

    it('opens a full-width drawer on Periods for a preset', async () => {
      render(<Period />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog', {
        name: 'Choose dates, Sales period'
      })
      expect(drawer).toHaveAttribute('data-slot', 'drawer-popup')
      await expect.poll(() => box(drawer).bottom).toBe(window.innerHeight)
      expect(box(drawer).left).toBe(0)
      expect(box(drawer).right).toBe(window.innerWidth)
      expect(tab('Periods')).toHaveAttribute('aria-selected', 'true')
      expect(textOf(summary(drawer))).toMatch(
        /^28 Sept? to 4 Oct 2026 · 7 days$/
      )
      expect(drawer).toHaveAccessibleDescription(
        /^28 Sept? to 4 Oct 2026 · 7 days$/
      )
      const body = bodyOf(drawer)
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth)
    })

    it('lists each period with its dates, the chosen one marked', async () => {
      render(<Period />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      const periods = within(drawer).getByRole('list', { name: 'Periods' })
      const lastWeek = within(periods).getByRole('button', {
        name: /^Last week/
      })
      expect(lastWeek).toHaveAttribute('aria-current', 'true')
      expect(lastWeek).toHaveAccessibleName(
        /^Last week\s+28 Sept? to 4 Oct 2026$/
      )
      const dates = lastWeek.querySelector(
        '[data-slot="date-range-picker-period-dates"]'
      )!
      const title = lastWeek.querySelector('[data-slot="list-item-title"]')!
      expect(box(dates).left).toBeGreaterThan(box(title).right)
      expect(box(dates).top).toBeLessThan(box(title).bottom)
      expect(
        within(periods).getByRole('heading', { name: 'Recent' })
      ).toBeInTheDocument()
      expect(
        within(periods).getByRole('heading', { name: 'To date' })
      ).toBeInTheDocument()
      expect(
        within(periods)
          .getAllByRole('button')
          .filter((row) => row.hasAttribute('aria-current'))
      ).toHaveLength(1)
      await expect.poll(() => document.activeElement).toBe(lastWeek)
    })

    it('opens on Calendar for custom dates, months filling the width', async () => {
      render(<Period initial={{ start: '2026-10-05', end: '2026-10-09' }} />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      expect(tab('Calendar')).toHaveAttribute('aria-selected', 'true')
      expect(summary(drawer)).toHaveTextContent('5 to 9 Oct 2026 · 5 days')
      const grid = within(drawer).getByRole('grid', { name: 'October 2026' })
      const cells = Array.from(
        grid.querySelectorAll('tbody tr:nth-child(2) td'),
        (td) => box(td).width
      )
      const total = cells.reduce((sum, w) => sum + w, 0)
      expect(total).toBeCloseTo(box(grid).width, 0)
      const body = bodyOf(drawer)
      expect(box(grid).width).toBeGreaterThan(body.clientWidth - 64)
      expect(box(day('2026-10-12')).width).toBeGreaterThanOrEqual(44)
      // The band runs edge to edge across a week inside the range.
      const middle = day('2026-10-07').closest('td')!
      expect(getComputedStyle(middle).backgroundColor).not.toBe(
        'rgba(0, 0, 0, 0)'
      )
      expect(box(middle).left).toBe(box(day('2026-10-06').closest('td')!).right)
    })

    it('switches between Periods and Calendar', async () => {
      render(<Period />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      await userEvent.click(tab('Calendar'))
      expect(tab('Calendar')).toHaveAttribute('aria-selected', 'true')
      // The outgoing panel leaves once its transition ends.
      await expect
        .poll(() => within(drawer).queryByRole('list', { name: 'Periods' }))
        .toBeNull()
      expect(
        within(drawer).getByRole('combobox', { name: 'Start' })
      ).toBeVisible()
      await userEvent.click(tab('Periods'))
      expect(
        within(drawer).getByRole('list', { name: 'Periods' })
      ).toBeVisible()
      await expect
        .poll(() => within(drawer).queryByRole('combobox', { name: 'Start' }))
        .toBeNull()
    })

    it('scrolls months under a pinned weekday row', async () => {
      render(<Period initial={{ start: '2026-10-05', end: '2026-10-09' }} />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      const body = bodyOf(drawer)
      const weekdays = drawer.querySelector<HTMLElement>(
        '[data-slot="calendar-weekdays"]'
      )!
      expect(
        within(drawer).queryByRole('button', { name: 'Next month' })
      ).toBeNull()
      expect(
        drawer.querySelectorAll('[data-slot="calendar-month"]').length
      ).toBeGreaterThan(3)
      const october = drawer.querySelector('[data-month="2026-10-01"]')!
      await expect
        .poll(() => Math.round(box(october).top))
        .toBe(Math.round(box(weekdays).bottom))
      body.scrollTop += 400
      await expect
        .poll(() => Math.round(box(weekdays).top))
        .toBe(Math.round(box(body).top))
      const header = drawer.querySelector('[data-slot="drawer-header"]')!
      expect(box(weekdays).top).toBeGreaterThanOrEqual(box(header).bottom - 1)
    })

    it('scrolls back to a typed start after scrolling away', async () => {
      render(<Period initial={{ start: '2026-10-05', end: '2026-10-09' }} />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      const body = bodyOf(drawer)
      const weekdays = drawer.querySelector('[data-slot="calendar-weekdays"]')!
      const october = () => drawer.querySelector('[data-month="2026-10-01"]')!
      await expect
        .poll(() => Math.round(box(october()).top))
        .toBe(Math.round(box(weekdays).bottom))
      body.scrollTop += 1500
      await expect
        .poll(() => box(october()).bottom)
        .toBeLessThan(box(weekdays).top)
      const start = within(drawer).getByRole('combobox', { name: 'Start' })
      await userEvent.clear(start)
      await userEvent.type(start, '6 oct 2026{Enter}')
      await expect
        .poll(() => Math.round(box(october()).top))
        .toBe(Math.round(box(weekdays).bottom))
    })

    it('pins a weekday row as wide as the drawer, over the day columns', async () => {
      render(<Period initial={{ start: '2026-10-05', end: '2026-10-09' }} />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      await expect.poll(() => box(drawer).bottom).toBe(window.innerHeight)
      const weekdays = drawer.querySelector('[data-slot="calendar-weekdays"]')!
      expect(box(weekdays).left).toBe(box(drawer).left)
      expect(box(weekdays).right).toBe(box(drawer).right)
      const labels = Array.from(weekdays.children, box)
      const cells = Array.from(
        drawer.querySelectorAll(
          '[data-month="2026-10-01"] tbody tr:nth-child(2) td'
        ),
        box
      )
      labels.forEach((label, i) =>
        expect(label.left + label.width / 2).toBeCloseTo(
          cells[i]!.left + cells[i]!.width / 2,
          0
        )
      )
    })

    it('sizes Start and End as touch-sized fields', async () => {
      render(<Period initial={{ start: '2026-10-05', end: '2026-10-09' }} />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      for (const name of ['Start', 'End'])
        expect(
          box(within(drawer).getByRole('combobox', { name })).height
        ).toBeGreaterThanOrEqual(40)
    })

    it('opens the Calendar tab on the chosen month, in strict mode too', async () => {
      render(
        <StrictMode>
          <Period initial={{ direction: 'past', amount: 30, unit: 'day' }} />
        </StrictMode>
      )
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      await expect.poll(() => box(drawer).bottom).toBe(window.innerHeight)
      await userEvent.click(tab('Calendar'))
      const weekdays = drawer.querySelector('[data-slot="calendar-weekdays"]')!
      const september = () => drawer.querySelector('[data-month="2026-09-01"]')!
      await expect
        .poll(() => Math.abs(box(september()).top - box(weekdays).bottom))
        .toBeLessThan(2)
    })

    it('keeps Start and End level when one shows an error', async () => {
      render(<Period initial={{ start: '2026-10-05', end: '2026-10-09' }} />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      const start = within(drawer).getByRole('combobox', { name: 'Start' })
      const end = within(drawer).getByRole('combobox', { name: 'End' })
      await userEvent.clear(start)
      await userEvent.type(start, '20 oct 2026{Enter}')
      await expect.element(end).toHaveAttribute('aria-invalid', 'true')
      expect(box(start).top).toBe(box(end).top)
    })

    it('keeps Clear and Apply in view at the foot', async () => {
      render(<Period commit='apply' />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      await userEvent.click(tab('Calendar'))
      const footer = footerOf(drawer)
      const clear = within(footer).getByRole('button', { name: 'Clear' })
      const apply = within(footer).getByRole('button', { name: 'Apply' })
      expect(box(apply).bottom).toBeLessThanOrEqual(window.innerHeight)
      expect(box(clear).top).toBe(box(apply).top)
      expect(box(apply).width).toBeGreaterThan(box(clear).width)
      expect(box(footer).top).toBeGreaterThanOrEqual(box(bodyOf(drawer)).bottom)
      expect(
        within(drawer).queryByRole('button', { name: 'Cancel' })
      ).toBeNull()
      await userEvent.click(clear)
      expect(summary(drawer)).toHaveTextContent('No dates chosen')
      expect(document.querySelector('output')).toHaveTextContent('"last-week"')
    })

    it('moves through Close, the tabs, the periods, then Clear and Apply', async () => {
      render(<Period commit='apply' />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog')
      const close = within(drawer).getByRole('button', { name: 'Close' })
      close.focus()
      await userEvent.tab()
      expect(document.activeElement).toBe(tab('Periods'))
      await userEvent.tab()
      const rows = within(drawer).getAllByRole('button', {
        name: /^(Today|Yesterday|Last|Week|Month|Quarter|Financial)/
      })
      // The scrolling body and the tab panel each take a stop of their own.
      for (
        let stops = 0;
        stops < 2 && document.activeElement !== rows[0];
        stops++
      )
        await userEvent.tab()
      expect(document.activeElement).toBe(rows[0])
      for (let i = 1; i < rows.length; i++) await userEvent.tab()
      expect(document.activeElement).toBe(rows.at(-1))
      await userEvent.tab()
      expect(document.activeElement).toHaveAccessibleName('Clear')
      await userEvent.tab()
      expect(document.activeElement).toHaveAccessibleName('Apply')
    })
  })
}

describe('DateRangePicker on a phone', TIMEOUT, () => {
  beforeAll(() => page.viewport(390, 844))
  afterAll(() => page.viewport(1920, 1080))

  it('chooses a tapped period, held for Apply', async () => {
    setHoverCapable(false)
    render(<Period commit='apply' />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    await userEvent.click(
      within(drawer).getByRole('button', { name: /^Last 30 days/ })
    )
    expect(textOf(summary(drawer))).toMatch(/^8 Sept? to 7 Oct 2026 · 30 days$/)
    expect(screen.getByRole('dialog')).toBe(drawer)
    await userEvent.click(within(drawer).getByRole('button', { name: 'Apply' }))
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    expect(trigger().textContent).toContain('Last 30 days')
  })

  it('closes on a tapped period when changes are immediate', async () => {
    setHoverCapable(false)
    render(<Period />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    await userEvent.click(
      within(drawer).getByRole('button', { name: /^Last 30 days/ })
    )
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    expect(trigger().textContent).toContain('Last 30 days')
  })

  it('applies tapped days and gives focus back to the button', async () => {
    await page.viewport(360, 740)
    setHoverCapable(false)
    render(<Period commit='apply' initial={null} />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    expect(tab('Calendar')).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(day('2026-10-12'))
    expect(summary(drawer)).toHaveTextContent('From 12 Oct 2026')
    await userEvent.click(day('2026-10-15'))
    expect(summary(drawer)).toHaveTextContent('12 to 15 Oct 2026 · 4 days')
    await userEvent.click(within(drawer).getByRole('button', { name: 'Apply' }))
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    expect(document.querySelector('output')).toHaveTextContent(
      '{"start":"2026-10-12","end":"2026-10-15"}'
    )
    await expect.poll(() => document.activeElement).toBe(trigger())
  })

  it('moves only the end once End is tapped', async () => {
    setHoverCapable(false)
    render(
      <Period
        commit='apply'
        initial={{ start: '2026-10-05', end: '2026-10-09' }}
      />
    )
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    const end = within(drawer).getByRole('combobox', { name: 'End' })
    await userEvent.click(end)
    expect(end).toHaveAttribute('data-picking')
    await userEvent.click(day('2026-10-20'))
    expect(summary(drawer)).toHaveTextContent('5 to 20 Oct 2026 · 16 days')
  })

  it('marks the end a tap will set', async () => {
    setHoverCapable(false)
    render(<Period commit='apply' initial={null} />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    const start = within(drawer).getByRole('combobox', { name: 'Start' })
    const end = within(drawer).getByRole('combobox', { name: 'End' })
    expect(start).toHaveAttribute('data-picking')
    await userEvent.click(day('2026-10-12'))
    expect(end).toHaveAttribute('data-picking')
    expect(start).not.toHaveAttribute('data-picking')
  })

  it('shows only the calendar when there are no presets', async () => {
    render(
      <DateRangePicker aria-label='Tour dates' today={TODAY} presets={[]} />
    )
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).queryByRole('tab')).toBeNull()
    expect(
      within(drawer).getByRole('combobox', { name: 'Start' })
    ).toBeVisible()
    expect(drawer.querySelector('[data-slot="calendar"]')).not.toBeNull()
  })
})

describe('DateRangePicker finishing a range in another month', TIMEOUT, () => {
  afterAll(() => page.viewport(1920, 1080))

  it('ends it in the next month after turning the page', async () => {
    await page.viewport(900, 900)
    render(<Period initial={null} commit='apply' />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    await userEvent.click(day('2026-10-01'))
    await userEvent.click(
      within(popup).getByRole('button', { name: 'Next month' })
    )
    await userEvent.click(day('2026-11-05'))
    expect(within(popup).getByRole('combobox', { name: 'Start' })).toHaveValue(
      '1 Oct 2026'
    )
    expect(within(popup).getByRole('combobox', { name: 'End' })).toHaveValue(
      '5 Nov 2026'
    )
  })

  it('ends it in a month scrolled to on a phone', async () => {
    await page.viewport(390, 844)
    setHoverCapable(false)
    render(<Period initial={null} commit='apply' />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    await expect.poll(() => box(drawer).bottom).toBe(window.innerHeight)
    await userEvent.click(day('2026-10-01'))
    const body = bodyOf(drawer)
    const weekdays = drawer.querySelector('[data-slot="calendar-weekdays"]')!
    const november = drawer.querySelector('[data-month="2026-11-01"]')!
    body.scrollTop += box(november).top - box(weekdays).bottom
    await settle()
    await userEvent.click(day('2026-11-05'))
    expect(textOf(summary(drawer))).toMatch(/^1 Oct to 5 Nov 2026 · 36 days$/)
  })
})

describe('DateRangePicker suggestions in a drawer', TIMEOUT, () => {
  beforeAll(() => page.viewport(390, 844))
  afterAll(() => page.viewport(1920, 1080))

  const topmostIn = (element: Element) => {
    const { left, top, width, height } = box(element)
    const hit = document.elementFromPoint(left + width / 2, top + height / 2)
    return !!hit && element.contains(hit)
  }

  it('shows suggestions over the drawer, on screen, and takes a tapped one', async () => {
    setHoverCapable(false)
    render(<Period initial={null} />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    const start = within(drawer).getByRole('combobox', { name: 'Start' })
    await userEvent.click(start)
    await userEvent.type(start, 'tom')
    const option = await screen.findByRole('option', { name: /^Tomorrow/ })
    const list = screen.getByRole('listbox')
    expect(box(list).left).toBeGreaterThanOrEqual(0)
    expect(box(list).right).toBeLessThanOrEqual(window.innerWidth)
    expect(box(list).bottom).toBeLessThanOrEqual(window.innerHeight)
    expect(topmostIn(option)).toBe(true)
    await userEvent.click(option)
    await expect.poll(() => start).toHaveValue('8 Oct 2026')
    expect(screen.getByRole('dialog')).toBe(drawer)
    await expect.poll(() => screen.queryByRole('listbox')).toBeNull()
  })

  it('closes only the suggestions on Escape', async () => {
    render(<Period initial={null} />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    const start = within(drawer).getByRole('combobox', { name: 'Start' })
    await userEvent.click(start)
    await userEvent.type(start, 'fr')
    await screen.findByRole('listbox')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('dialog')).toBe(drawer)
    expect(start).toHaveValue('fr')
  })

  it('suggests single dates only, never ranges', async () => {
    render(<Period initial={null} />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    await userEvent.click(tab('Calendar'))
    const start = within(drawer).getByRole('combobox', { name: 'Start' })
    await userEvent.click(start)
    await userEvent.type(start, 'next we')
    await screen.findByRole('option', { name: /^Next Wed/ })
    await userEvent.type(start, 'ek')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(screen.queryByRole('option', { name: /^Next week/ })).toBeNull()
  })

  it('suggests no end before the start', async () => {
    render(<Period initial={{ start: '2026-10-09', end: '2026-10-12' }} />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    const end = within(drawer).getByRole('combobox', { name: 'End' })
    await userEvent.click(end)
    await userEvent.clear(end)
    await userEvent.type(end, '8 oct')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(screen.queryByRole('option', { name: /8 Oct/ })).toBeNull()
    await userEvent.clear(end)
    await userEvent.type(end, '10 oct')
    await screen.findByRole('option', { name: /^10 Oct 2026/ })
  })
})

describe('DateRangePicker trigger', TIMEOUT, () => {
  it('dims once when disabled', () => {
    render(<DateRangePicker aria-label='Period' disabled />)
    let opacity = 1
    for (let node: Element | null = trigger(); node; node = node.parentElement)
      opacity *= Number(getComputedStyle(node).opacity)
    expect(opacity).toBeCloseTo(0.5)
  })

  it('keeps a read-only range at full strength', () => {
    render(
      <DateRangePicker aria-label='Period' defaultValue='today' readOnly />
    )
    expect(getComputedStyle(trigger()).opacity).toBe('1')
  })
})
