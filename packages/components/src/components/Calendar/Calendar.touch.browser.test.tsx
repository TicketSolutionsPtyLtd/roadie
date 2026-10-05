import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from 'vitest'
import { commands, page } from 'vitest/browser'

import { Calendar, type CalendarSingleProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { tapOn } from '../../utils/touchTestUtils'
import { useStylesheet } from '../Pane/testUtils'

const TIMEOUT = { timeout: 20_000 }
// 1 March 2027 is a Monday.
const TODAY = '2027-03-10'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// A turn lands, then its slide finishes; a slow runner takes longer.
const settle = async (ms = 300) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
  await expect
    .poll(() => document.querySelector('[data-swiping]'), { timeout: 3000 })
    .toBeNull()
}
const caption = () =>
  document.querySelector('[data-slot="calendar-header"]')!.textContent
const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!

function grid() {
  return document
    .querySelector('[data-slot="calendar-grid"]')!
    .getBoundingClientRect()
}

async function swipe(way: 'left' | 'right' | 'up' | 'down', distance = 160) {
  const box = grid()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  const to = {
    left: { x: x - distance, y },
    right: { x: x + distance, y },
    up: { x, y: y - distance / 2 },
    down: { x, y: y + distance / 2 }
  }[way]
  await commands.swipe({ x, y }, to)
  await settle()
}

function Paged(props: Partial<CalendarSingleProps>) {
  return (
    <div className='p-4'>
      <Calendar today={TODAY} {...props} />
    </div>
  )
}

// A finger held down mid-drag, so a test can look before it lifts.
function holdDrag(target: Element, dx: number, dy: number) {
  const box = target.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  const touchAt = (along: number) =>
    new Touch({
      identifier: 1,
      target,
      clientX: x + dx * along,
      clientY: y + dy * along
    })
  const fire = (type: string, along: number) =>
    target.dispatchEvent(
      new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === 'touchend' ? [] : [touchAt(along)],
        changedTouches: [touchAt(along)]
      })
    )
  fire('touchstart', 0)
  fire('touchmove', 0.25)
  fire('touchmove', 1)
  return () => fire('touchend', 1)
}

const peek = () => document.querySelector<HTMLElement>('[data-peek]')

describe('Calendar shows the page it turns to', TIMEOUT, () => {
  it('shows the next month beside the days as they follow a finger', async ({
    skip
  }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged />)
    const days = document.querySelector('[data-slot="calendar-days"]')!
    const lift = holdDrag(day('2027-03-17'), -60, 0)
    const incoming = peek()!
    expect(incoming).toHaveAttribute('aria-hidden', 'true')
    expect(incoming.querySelector('[data-date="2027-04-01"]')).not.toBeNull()
    const current = days.getBoundingClientRect()
    const next = incoming
      .querySelector('[data-slot="calendar-days"]')!
      .getBoundingClientRect()
    expect(next.left).toBeCloseTo(current.right, 0)
    expect(next.top).toBeCloseTo(current.top, 0)
    const clip = days.closest('table')!.parentElement!.getBoundingClientRect()
    expect(next.left).toBeLessThan(clip.right)
    lift()
    await settle()
    expect(caption()).toContain('April 2027')
    expect(peek()).toBeNull()
  })

  it('shows the next month below the days on a vertical drag', async ({
    skip
  }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged direction='vertical' />)
    const days = document.querySelector('[data-slot="calendar-days"]')!
    const lift = holdDrag(day('2027-03-17'), 0, -60)
    const incoming = peek()!
    expect(incoming.textContent).toContain('April 2027')
    const current = days.getBoundingClientRect()
    expect(
      Math.abs(incoming.getBoundingClientRect().top - current.bottom)
    ).toBeLessThanOrEqual(4)
    const clip = days.closest('table')!.parentElement!.getBoundingClientRect()
    expect(incoming.getBoundingClientRect().top).toBeLessThan(clip.bottom)
    lift()
    await settle()
    expect(caption()).toContain('April 2027')
  })

  it('moves the days of several months and the incoming ones as one strip', async ({
    skip
  }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    await page.viewport(900, 844)
    onTestFinished(() => page.viewport(390, 844))
    render(
      <div className='w-200'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const days = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="calendar-days"]')
    ]
    const still = [
      ...document.querySelectorAll('[data-slot="calendar-month"] thead'),
      screen.getByText('March 2027'),
      screen.getByText('April 2027')
    ]
    const before = still.map((element) =>
      element.getBoundingClientRect().toJSON()
    )
    const lift = holdDrag(day('2027-03-17'), -60, 0)
    const incoming = peek()!
    expect(incoming.querySelector('[data-date="2027-05-01"]')).not.toBeNull()
    const moves = [...days, incoming].map((part) => part.style.transform)
    expect(new Set(moves).size).toBe(1)
    expect(moves[0]).toMatch(/^translate3d\(-60px/)
    expect(
      still.map((element) => element.getBoundingClientRect().toJSON())
    ).toEqual(before)
    const last = days[1]!.getBoundingClientRect()
    const next = incoming
      .querySelector('[data-slot="calendar-days"]')!
      .getBoundingClientRect()
    expect(next.left - last.right).toBeCloseTo(24, 0)
    expect(next.top).toBeCloseTo(last.top, 0)
    lift()
    await settle()
    expect(
      [...document.querySelectorAll('[data-slot="calendar-month"]')].map(
        (month) => month.getAttribute('data-month')
      )
    ).toEqual(['2027-04-01', '2027-05-01'])
  })

  it('turns stacked months as strips of their own', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged numberOfMonths={2} />)
    const days = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="calendar-days"]')
    ]
    expect(days[1]!.getBoundingClientRect().top).toBeGreaterThan(
      days[0]!.getBoundingClientRect().bottom
    )
    const lift = holdDrag(day('2027-03-17'), -100, 0)
    const incoming = [...document.querySelectorAll<HTMLElement>('[data-peek]')]
    expect(incoming).toHaveLength(2)
    expect(
      incoming[0]!.querySelector('[data-date="2027-04-01"]')
    ).not.toBeNull()
    expect(
      incoming[1]!.querySelector('[data-date="2027-05-01"]')
    ).not.toBeNull()
    days.forEach((row, i) => {
      const next = incoming[i]!.querySelector(
        '[data-slot="calendar-days"]'
      )!.getBoundingClientRect()
      expect(next.left - row.getBoundingClientRect().right).toBeCloseTo(24, 0)
      expect(next.top).toBeCloseTo(row.getBoundingClientRect().top, 0)
    })
    lift()
    await settle()
    expect(
      [...document.querySelectorAll('[data-slot="calendar-month"]')].map(
        (month) => month.getAttribute('data-month')
      )
    ).toEqual(['2027-04-01', '2027-05-01'])
  })

  it('shows no other page when motion is reduced, or at rest', async ({
    skip
  }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged />)
    expect(peek()).toBeNull()
    await commands.reduceMotion(true)
    onTestFinished(() => commands.reduceMotion(false))
    const lift = holdDrag(day('2027-03-17'), -60, 0)
    expect(peek()).toBeNull()
    lift()
    expect(caption()).toContain('April 2027')
  })
})

describe('Calendar arrows tapped with several months', TIMEOUT, () => {
  it.each([390, 1280])('turn the page when tapped at %ipx', async (width) => {
    await page.viewport(width, 844)
    onTestFinished(() => page.viewport(390, 844))
    render(<Calendar today={TODAY} numberOfMonths={2} />)
    const months = () =>
      [...document.querySelectorAll('[data-slot="calendar-month"]')].map(
        (month) => month.getAttribute('data-month')
      )
    await tapOn(screen.getByRole('button', { name: 'Next month' }), 'centre')
    await settle()
    expect(months()).toEqual(['2027-04-01', '2027-05-01'])
    await tapOn(
      screen.getByRole('button', { name: 'Previous month' }),
      'centre'
    )
    await settle()
    expect(months()).toEqual(['2027-03-01', '2027-04-01'])
  })
})

describe('Calendar swiped on a phone', TIMEOUT, () => {
  it('turns to the next month with a swipe to the left', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    const onMonthChange = vi.fn()
    const onSelect = vi.fn()
    render(<Paged onMonthChange={onMonthChange} onSelect={onSelect} />)
    await swipe('left')
    expect(caption()).toContain('April 2027')
    expect(onMonthChange).toHaveBeenLastCalledWith('2027-04-01')
    expect(onSelect).not.toHaveBeenCalled()
    await swipe('right')
    await swipe('right')
    expect(caption()).toContain('February 2027')
    const grids = document.querySelectorAll<HTMLElement>(
      '[data-slot="calendar-days"]'
    )
    expect([...grids].every((table) => table.style.transform === '')).toBe(true)
    expect(document.querySelector('[data-swiping]')).toBeNull()
  })

  it('stays on the month for a short drag, and still chooses on a tap', async ({
    skip
  }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    const onSelect = vi.fn()
    render(<Paged onSelect={onSelect} />)
    await swipe('left', 20)
    expect(caption()).toContain('March 2027')
    await tapOn(day('2027-03-17'), 'centre')
    expect(onSelect).toHaveBeenLastCalledWith('2027-03-17')
  })

  it('chooses a day tapped straight after a short drag', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    const onSelect = vi.fn()
    render(<Paged onSelect={onSelect} />)
    const box = grid()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    await commands.swipe({ x, y }, { x: x - 20, y })
    await tapOn(day('2027-03-17'), 'centre')
    expect(onSelect).toHaveBeenLastCalledWith('2027-03-17')
  })

  it('turns only when the swipe starts on the days', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged />)
    const header = document
      .querySelector('[data-slot="calendar-header"]')!
      .getBoundingClientRect()
    const y = header.top + header.height / 2
    await commands.swipe({ x: header.left + 40, y }, { x: header.left + 10, y })
    await commands.swipe(
      { x: header.left + 200, y },
      { x: header.left + 40, y }
    )
    await settle()
    expect(caption()).toContain('March 2027')
  })

  it('swipes the other way in a right-to-left page', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(
      <div dir='rtl'>
        <Paged />
      </div>
    )
    await swipe('right')
    expect(caption()).toContain('April 2027')
  })

  it('swipes up and down when vertical', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged direction='vertical' />)
    await swipe('up')
    expect(caption()).toContain('April 2027')
    await swipe('down')
    expect(caption()).toContain('March 2027')
    await swipe('left')
    expect(caption()).toContain('March 2027')
  })

  it('turns on a vertical swipe whose pointer iOS cancels', async ({
    skip
  }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged direction='vertical' />)
    const target = day('2027-03-17')
    const box = target.getBoundingClientRect()
    const x = box.left + box.width / 2
    let y = box.top + box.height / 2
    const touchAt = (clientY: number) =>
      new Touch({ identifier: 1, target, clientX: x, clientY })
    const fire = (type: string, clientY: number) =>
      target.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === 'touchend' ? [] : [touchAt(clientY)],
          changedTouches: [touchAt(clientY)]
        })
      )
    const pointer = (type: string, clientY: number) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 7,
          pointerType: 'touch',
          isPrimary: true,
          clientX: x,
          clientY
        })
      )
    pointer('pointerdown', y)
    fire('touchstart', y)
    for (let step = 0; step < 4; step++) {
      y -= 10
      pointer('pointermove', y)
      fire('touchmove', y)
    }
    pointer('pointercancel', y)
    for (let step = 0; step < 8; step++) {
      y -= 10
      fire('touchmove', y)
    }
    fire('touchend', y)
    await settle()
    expect(caption()).toContain('April 2027')
  })

  it.for(['horizontal', 'vertical'] as const)(
    'keeps the weekday row still while the days follow a %s swipe',
    async (direction, { skip }) => {
      if (!navigator.userAgent.includes('Chrome')) skip()
      render(<Paged direction={direction} />)
      const target = day('2027-03-17')
      const start = target.getBoundingClientRect()
      const x = start.left + start.width / 2
      const y = start.top + start.height / 2
      const touchAt = (dx: number, dy: number) =>
        new Touch({ identifier: 1, target, clientX: x + dx, clientY: y + dy })
      const fire = (type: string, dx: number, dy: number) =>
        target.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: type === 'touchend' ? [] : [touchAt(dx, dy)],
            changedTouches: [touchAt(dx, dy)]
          })
        )
      const weekdays = document.querySelector(
        '[data-slot="calendar-grid"] thead'
      )!
      const header = document.querySelector('[data-slot="calendar-header"]')!
      const before = [weekdays, header].map((el) =>
        el.getBoundingClientRect().toJSON()
      )
      const [dx, dy] = direction === 'vertical' ? [0, -40] : [-40, 0]
      fire('touchstart', 0, 0)
      fire('touchmove', dx / 4, dy / 4)
      fire('touchmove', dx, dy)
      const moved = target.getBoundingClientRect()
      expect(moved.left - start.left).toBe(dx)
      expect(moved.top - start.top).toBe(dy)
      expect(
        [weekdays, header].map((el) => el.getBoundingClientRect().toJSON())
      ).toEqual(before)
      if (direction === 'vertical') {
        const cell = weekdays.querySelector('th')!.getBoundingClientRect()
        const covering = document.elementFromPoint(
          cell.left + cell.width / 2,
          cell.bottom - 2
        )
        expect(weekdays.contains(covering)).toBe(true)
      }
      fire('touchend', dx, dy)
      await settle()
    }
  )

  it('turns straight away when motion is reduced', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    await commands.reduceMotion(true)
    onTestFinished(() => commands.reduceMotion(false))
    render(<Paged />)
    const box = grid()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    await commands.swipe({ x, y }, { x: x - 160, y })
    expect(caption()).toContain('April 2027')
  })

  it('goes no further than startMonth', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged startMonth='2027-03-01' />)
    await swipe('right')
    expect(caption()).toContain('March 2027')
  })

  it('turns a week at a time in week view', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged view='week' />)
    expect(day('2027-03-08')).toBeTruthy()
    await swipe('left')
    expect(day('2027-03-15')).toBeTruthy()
    expect(day('2027-03-08')).toBeNull()
  })

  it('does not turn while disabled', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Paged disabled />)
    await swipe('left')
    expect(caption()).toContain('March 2027')
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })
})
