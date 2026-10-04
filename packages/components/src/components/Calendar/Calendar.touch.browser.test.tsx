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

const settle = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))
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

  it('slides each of several months by its own height when vertical', async ({
    skip
  }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(
      <Paged
        direction='vertical'
        numberOfMonths={2}
        defaultMonth='2027-02-01'
      />
    )
    const grids = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="calendar-days"]')
    ]
    const heights = grids.map((grid) => grid.getBoundingClientRect().height)
    expect(heights[0]).not.toBe(heights[1])
    const box = grids[0]!.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    await commands.swipe({ x, y }, { x, y: y - 120 })
    const ends = grids.map((grid) => {
      const frames = grid.getAnimations()[0]?.effect
      return (frames as KeyframeEffect | undefined)?.getKeyframes().at(-1)
        ?.transform
    })
    expect(ends).toEqual(
      heights.map((height) => `translate3d(0px, ${-height}px, 0px)`)
    )
    await settle()
  })

  // iOS Safari cancels the pointer once its pan recogniser starts on a
  // vertical drag, even with touch-action stopping the scroll, while the
  // touch carries on to touchend.
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
