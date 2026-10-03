import { useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { DashboardPeriod, type DashboardPeriodValue } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { withFrames } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'
const TIMEOUT = { timeout: 15_000 }

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const box = (element: Element) => element.getBoundingClientRect()
const middle = (rect: DOMRect) => rect.top + rect.height / 2

const picker = () =>
  screen.getByRole('button', { name: /^Choose dates, Period/ })

function Controlled() {
  const [value, setValue] = useState<DashboardPeriodValue>({
    range: 'this-month',
    compare: 'previous-period'
  })
  return (
    <div className='grid gap-2 p-4'>
      <DashboardPeriod today={TODAY} value={value} onValueChange={setValue}>
        <button type='button'>Similar venues</button>
      </DashboardPeriod>
      <output>{JSON.stringify(value)}</output>
    </div>
  )
}

describe('DashboardPeriod layout', TIMEOUT, () => {
  it('is one full-width button on a phone, the app’s own control below', () => {
    render(
      <div style={{ width: 358 }}>
        <Controlled />
      </div>
    )
    const group = screen.getByRole('group', { name: 'Dashboard period' })
    const own = screen.getByRole('button', { name: 'Similar venues' })
    expect(box(picker()).width).toBeCloseTo(box(group).width, 0)
    expect(box(own).top).toBeGreaterThanOrEqual(box(picker()).bottom)
  })

  it('sits in a row with the app’s own control when there is room', () => {
    render(
      <div style={{ width: 1100 }}>
        <Controlled />
      </div>
    )
    const group = screen.getByRole('group', { name: 'Dashboard period' })
    const own = screen.getByRole('button', { name: 'Similar venues' })
    expect(middle(box(own))).toBeCloseTo(middle(box(picker())), 0)
    expect(box(picker()).width).toBeLessThan(box(group).width)
  })
})

for (const [width, height] of [
  [390, 844],
  [360, 740]
] as const) {
  describe(`DashboardPeriod on a ${width}px phone`, TIMEOUT, () => {
    beforeAll(() => page.viewport(width, height))
    afterAll(() => page.viewport(1920, 1080))

    it('turns the comparison on, picks previous year and applies both', async () => {
      render(<Controlled />)
      await userEvent.click(picker())
      const drawer = await screen.findByRole('dialog')
      expect(drawer).toHaveAttribute('data-slot', 'drawer-popup')
      await withFrames(() =>
        expect.poll(() => box(drawer).bottom).toBe(window.innerHeight)
      )
      const footer = drawer.querySelector<HTMLElement>(
        '[data-slot="drawer-footer"]'
      )!
      const compare = within(footer).getByRole('switch', { name: 'Compare' })
      const apply = within(footer).getByRole('button', { name: 'Apply' })
      expect(box(apply).bottom).toBeLessThanOrEqual(window.innerHeight)
      expect(box(compare).bottom).toBeLessThanOrEqual(box(apply).top)
      await userEvent.click(compare)
      expect(compare).not.toBeChecked()
      await userEvent.click(compare)
      await userEvent.click(
        within(footer).getByRole('button', { name: 'Previous year' })
      )
      expect(
        footer.querySelector('[data-slot="dashboard-period-compare-dates"]')
      ).toHaveTextContent('1 to 31 Oct 2025')
      expect(box(apply).bottom).toBeLessThanOrEqual(window.innerHeight)
      const body = drawer.querySelector('[data-slot="drawer-body"]')!
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth)
      await userEvent.click(
        within(drawer).getByRole('tab', { name: 'Periods' })
      )
      await userEvent.click(
        within(drawer).getByRole('button', { name: /^Last 30 days/ })
      )
      await userEvent.click(apply)
      await withFrames(() =>
        expect.poll(() => screen.queryByRole('dialog')).toBeNull()
      )
      expect(document.querySelector('output')).toHaveTextContent(
        '{"range":{"direction":"past","amount":30,"unit":"day"},"compare":"previous-year"}'
      )
      expect(picker()).toHaveAccessibleName(/vs 8 Sept? to 7 Oct 2025\)$/)
    })

    it('drops both changes on Close', async () => {
      render(<Controlled />)
      await userEvent.click(picker())
      const drawer = await screen.findByRole('dialog')
      await withFrames(() =>
        expect.poll(() => box(drawer).bottom).toBe(window.innerHeight)
      )
      await userEvent.click(
        within(drawer).getByRole('switch', { name: 'Compare' })
      )
      await userEvent.click(
        within(drawer).getByRole('tab', { name: 'Periods' })
      )
      await userEvent.click(
        within(drawer).getByRole('button', { name: /^Last 30 days/ })
      )
      await userEvent.click(
        within(drawer).getByRole('button', { name: 'Close' })
      )
      await withFrames(() =>
        expect.poll(() => screen.queryByRole('dialog')).toBeNull()
      )
      expect(document.querySelector('output')).toHaveTextContent(
        '{"range":"this-month","compare":"previous-period"}'
      )
    })
  })
}

for (const width of [358, 1100])
  describe(`DashboardPeriod's button at ${width}px`, TIMEOUT, () => {
    const button = () =>
      screen.getByRole('button', { name: /^Choose dates, Period/ })

    it('puts the comparison and its dates on a second line', () => {
      render(
        <div style={{ width }}>
          <DashboardPeriod
            today={TODAY}
            defaultValue={{ range: 'this-month', compare: 'previous-year' }}
          />
        </div>
      )
      const second = button().querySelector<HTMLElement>(
        '[data-slot="date-range-picker-suffix"]'
      )!
      const first = second.previousElementSibling as HTMLElement
      expect(first.textContent).toMatch(/^This month\s+1 to 31 Oct 2026$/)
      expect(second.textContent).toMatch(/^vs 1 to 31 Oct 2025$/)
      expect(second.offsetParent).not.toBeNull()
      expect(box(second).top).toBeGreaterThanOrEqual(box(first).bottom - 1)
      expect(box(button()).height).toBe(48)
      expect(box(second).bottom).toBeLessThanOrEqual(box(button()).bottom)
      expect(box(first).top).toBeGreaterThanOrEqual(box(button()).top)
    })

    it('is 48px tall, a large control, with no comparison', () => {
      render(
        <div style={{ width }}>
          <DashboardPeriod
            today={TODAY}
            defaultValue={{ range: 'this-month' }}
          />
        </div>
      )
      expect(box(button()).height).toBe(48)
    })
  })

describe('DashboardPeriod on a wide screen', TIMEOUT, () => {
  beforeAll(() => page.viewport(1280, 900))
  afterAll(() => page.viewport(1920, 1080))

  it('puts Compare under the calendar and applies with Cancel and Apply', async () => {
    render(<Controlled />)
    await userEvent.click(picker())
    const popup = await screen.findByRole('dialog')
    expect(popup).not.toHaveAttribute('data-slot', 'drawer-popup')
    const compare = within(popup).getByRole('switch', { name: 'Compare' })
    const calendar = popup.querySelector('[data-slot="calendar"]')!
    expect(box(compare).top).toBeGreaterThanOrEqual(box(calendar).bottom)
    await userEvent.click(
      within(popup).getByRole('button', { name: 'Previous year' })
    )
    await userEvent.click(within(popup).getByRole('button', { name: 'Apply' }))
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    expect(document.querySelector('output')).toHaveTextContent(
      '{"range":"this-month","compare":"previous-year"}'
    )
  })

  it('drops a changed comparison on Cancel', async () => {
    render(<Controlled />)
    await userEvent.click(picker())
    const popup = await screen.findByRole('dialog')
    await userEvent.click(
      within(popup).getByRole('switch', { name: 'Compare' })
    )
    await userEvent.click(within(popup).getByRole('button', { name: 'Cancel' }))
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    expect(document.querySelector('output')).toHaveTextContent(
      '{"range":"this-month","compare":"previous-period"}'
    )
  })
})
