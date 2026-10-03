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
      '[data-slot="calendar-grid"]'
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
