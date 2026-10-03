import { useState } from 'react'

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
    const start = within(popup).getByRole('textbox', { name: 'Start' })
    await userEvent.clear(start)
    await userEvent.type(start, '1 oct')
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
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
    const start = within(popup).getByRole('textbox', { name: 'Start' })
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

describe('DateRangePicker on a phone', TIMEOUT, () => {
  beforeAll(() => page.viewport(390, 844))
  afterAll(() => page.viewport(1920, 1080))

  it('opens a drawer with the presets first, then one month', async () => {
    render(<Period />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog', {
      name: 'Choose dates, Sales period'
    })
    expect(drawer).toHaveAttribute('data-slot', 'drawer-popup')
    await expect.poll(months).toBe(1)
    await expect.poll(() => box(drawer).bottom).toBe(window.innerHeight)
    const presets = within(drawer).getByRole('group', { name: 'Presets' })
    const calendar = drawer.querySelector('[data-slot="calendar"]')!
    expect(box(presets).bottom).toBeLessThanOrEqual(box(calendar).top)
    expect(box(drawer).left).toBe(0)
    expect(box(drawer).right).toBe(window.innerWidth)
    expect(box(screen.getByRole('grid')).right).toBeLessThanOrEqual(
      box(drawer).right
    )
    const body = drawer.querySelector('[data-slot="drawer-body"]')!
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth)
    const start = within(drawer).getByRole('textbox', { name: 'Start' })
    const end = within(drawer).getByRole('textbox', { name: 'End' })
    expect(box(start).top).toBe(box(end).top)
  })

  it('scrolls a tall drawer and keeps Apply in view', async () => {
    await page.viewport(390, 500)
    render(<Period commit='apply' />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    await expect.poll(() => box(drawer).bottom).toBe(500)
    const body = drawer.querySelector('[data-slot="drawer-body"]')!
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
    const apply = within(drawer).getByRole('button', { name: 'Apply' })
    expect(box(apply).bottom).toBeLessThanOrEqual(500)
    expect(box(apply).top).toBeGreaterThanOrEqual(box(body).bottom)
  })

  it('chooses a tapped preset', async () => {
    await page.viewport(390, 844)
    setHoverCapable(false)
    render(<Period />)
    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog')
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Last 30 days' })
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
    expect(box(day('2026-10-12')).width).toBeGreaterThanOrEqual(44)
    await userEvent.click(day('2026-10-12'))
    await userEvent.click(day('2026-10-15'))
    await userEvent.click(within(drawer).getByRole('button', { name: 'Apply' }))
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    expect(document.querySelector('output')).toHaveTextContent(
      '{"start":"2026-10-12","end":"2026-10-15"}'
    )
    await expect.poll(() => document.activeElement).toBe(trigger())
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
