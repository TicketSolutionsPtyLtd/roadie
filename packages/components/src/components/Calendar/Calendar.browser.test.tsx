import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Calendar, type CalendarSingleProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'
// 1 March 2027 is a Monday.
const TODAY = '2027-03-10'

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

const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!

const focused = () => (document.activeElement as HTMLElement).dataset.date

const caption = () =>
  screen
    .getAllByRole('grid')
    .map(
      (grid) =>
        document.getElementById(grid.getAttribute('aria-labelledby')!)!
          .textContent
    )

async function tabIntoGrid() {
  while (!focused()) await userEvent.tab()
}

describe('Calendar keyboard', () => {
  it('tabs to today, past the month arrows', async () => {
    render(<Calendar today={TODAY} />)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(focused()).toBe(TODAY)
  })

  it.each([
    ['{ArrowRight}', '2027-03-11'],
    ['{ArrowLeft}', '2027-03-09'],
    ['{ArrowDown}', '2027-03-17'],
    ['{ArrowUp}', '2027-03-03'],
    ['{Home}', '2027-03-08'],
    ['{End}', '2027-03-14'],
    ['{PageDown}', '2027-04-10'],
    ['{PageUp}', '2027-02-10'],
    ['{Shift>}{PageDown}{/Shift}', '2028-03-10'],
    ['{Shift>}{PageUp}{/Shift}', '2026-03-10']
  ])('moves focus with %s to %s', async (keys, expected) => {
    render(<Calendar today={TODAY} />)
    await tabIntoGrid()
    await userEvent.keyboard(keys)
    expect(focused()).toBe(expected)
    expect(document.activeElement).toHaveAttribute('data-focused')
    expect(document.activeElement).toHaveAttribute('tabindex', '0')
  })

  it('crosses into the next month a day at a time, skipping nothing', async () => {
    render(<Calendar today='2027-03-30' showOutsideDays />)
    await tabIntoGrid()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(caption()).toEqual(['April 2027'])
    expect(focused()).toBe('2027-04-01')
    expect(document.activeElement).not.toHaveAttribute('data-outside')
    await userEvent.keyboard('{ArrowLeft}')
    expect(caption()).toEqual(['March 2027'])
    expect(focused()).toBe('2027-03-31')
  })

  it('moves between shown months without turning the page', async () => {
    render(<Calendar today='2027-03-28' numberOfMonths={2} showOutsideDays />)
    await tabIntoGrid()
    await userEvent.keyboard('{ArrowDown}')
    expect(caption()).toEqual(['March 2027', 'April 2027'])
    expect(focused()).toBe('2027-04-04')
    expect(document.activeElement).not.toHaveAttribute('data-outside')
    await userEvent.keyboard('{PageDown}')
    expect(caption()).toEqual(['April 2027', 'May 2027'])
    expect(focused()).toBe('2027-05-04')
  })

  it('selects with Enter and Space', async () => {
    render(<Calendar today={TODAY} mode='multiple' />)
    await tabIntoGrid()
    await userEvent.keyboard('{Enter}{ArrowRight} ')
    expect(day(TODAY)).toHaveAttribute('data-selected')
    expect(day('2027-03-11')).toHaveAttribute('data-selected')
  })

  it('focuses a disabled day but does not select it', async () => {
    render(<Calendar today={TODAY} disabled='2027-03-11' />)
    await tabIntoGrid()
    await userEvent.keyboard('{ArrowRight}{Enter}')
    expect(focused()).toBe('2027-03-11')
    expect(day('2027-03-11')).not.toHaveAttribute('data-selected')
  })

  it('previews a range as the keyboard extends it', async () => {
    render(<Calendar today={TODAY} mode='range' />)
    await tabIntoGrid()
    await userEvent.keyboard('{Enter}{ArrowRight}{ArrowRight}')
    for (const date of ['2027-03-10', '2027-03-11', '2027-03-12'])
      expect(day(date)).toHaveAttribute('data-range-preview')
    expect(day('2027-03-12')).toHaveAttribute('data-range-end')
    await userEvent.keyboard('{Enter}')
    expect(day('2027-03-11')).toHaveAttribute('data-range-middle')
    expect(day('2027-03-11')).not.toHaveAttribute('data-range-preview')
  })
})

describe('Calendar focus', () => {
  it('keeps focus on the month arrows as they turn the page', async () => {
    render(<Calendar today={TODAY} />)
    await userEvent.tab()
    expect(document.activeElement).toHaveAccessibleName('Previous month')
    await userEvent.keyboard('{Enter}')
    expect(document.activeElement).toHaveAccessibleName('Previous month')
    await userEvent.tab()
    expect(document.activeElement).toHaveAccessibleName('Next month')
    await userEvent.keyboard('{Enter}{Enter}')
    expect(caption()).toEqual(['April 2027'])
    expect(document.activeElement).toHaveAccessibleName('Next month')
  })

  it('keeps focus on a caption select as it changes the month', async () => {
    render(<Calendar today={TODAY} captionLayout='dropdown' />)
    const month = screen.getByRole('combobox', { name: 'Month' })
    await userEvent.selectOptions(month, 'July')
    expect(caption()).toEqual(['July 2027'])
    expect(screen.getByRole('combobox', { name: 'Month' })).toBe(month)
  })

  it.each([
    ['Home on the first day of the week', '2027-03-08', '{Home}'],
    ['an arrow at the last month', '2027-03-31', '{ArrowRight}']
  ])('lets focus leave after %s', async (_, today, key) => {
    render(
      <>
        <Calendar today={today} endMonth='2027-03-01' />
        <input aria-label='After' />
      </>
    )
    await tabIntoGrid()
    await userEvent.keyboard(key)
    expect(focused()).toBe(today)
    await userEvent.tab()
    expect(document.activeElement).toHaveAccessibleName('After')
  })
})

describe('Calendar pointer', () => {
  it('previews a range under the pointer', async () => {
    render(<Calendar today={TODAY} mode='range' />)
    await userEvent.click(day('2027-03-03'))
    await userEvent.hover(day('2027-03-06'))
    for (const date of ['2027-03-03', '2027-03-04', '2027-03-05', '2027-03-06'])
      expect(day(date)).toHaveAttribute('data-range-preview')
    await userEvent.click(day('2027-03-06'))
    expect(day('2027-03-04')).toHaveAttribute('data-range-middle')
  })

  it('draws a range as one band from end to end', async () => {
    render(
      <div className='w-97.5'>
        <Calendar
          today={TODAY}
          mode='range'
          defaultSelected={{ start: '2027-03-03', end: '2027-03-05' }}
        />
      </div>
    )
    const start = day('2027-03-03')
    const middle = day('2027-03-04')
    const end = day('2027-03-05')
    const fill = (element: Element) => getComputedStyle(element).backgroundColor
    const cell = (button: Element) => button.closest('td')!
    expect(fill(cell(middle))).not.toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(cell(middle)).borderRadius).toBe('0px')
    expect(fill(start)).not.toBe(fill(cell(middle)))
    const band = (td: Element) => getComputedStyle(td, '::before')
    expect(band(cell(start)).backgroundColor).toBe(fill(cell(middle)))
    expect(band(cell(end)).backgroundColor).toBe(fill(cell(middle)))
    const [a, b, c] = [start, middle, end].map((el) =>
      cell(el).getBoundingClientRect()
    )
    expect(b!.left).toBe(a!.right)
    expect(c!.left).toBe(b!.right)
    // The band runs past the day's circle to the cell's edges.
    expect(b!.width).toBeGreaterThan(middle.getBoundingClientRect().width)
  })

  it('keeps an unchosen day clear on a touch screen', async () => {
    render(<Calendar today={TODAY} />)
    setHoverCapable(false)
    await userEvent.hover(day('2027-03-12'))
    expect(getComputedStyle(day('2027-03-12')).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)'
    )
  })

  it('chooses a range with two taps and no preview from touch', async () => {
    render(<Calendar today={TODAY} mode='range' />)
    setHoverCapable(false)
    await userEvent.click(day('2027-03-03'))
    day('2027-03-08').dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' })
    )
    day('2027-03-08').dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'touch' })
    )
    expect(day('2027-03-05')).not.toHaveAttribute('data-range-preview')
    await userEvent.click(day('2027-03-08'))
    expect(day('2027-03-05')).toHaveAttribute('data-range-middle')
  })
})

const cellsOf = (grid: Element) =>
  Array.from(grid.querySelectorAll('tbody tr:nth-child(2) td'), (td) =>
    td.getBoundingClientRect()
  )

describe('Calendar layout', () => {
  it('fills its container, its days centred in their columns', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} />
      </div>
    )
    const grid = screen.getByRole('grid')
    const month = document.querySelector('[data-slot="calendar-month"]')!
    expect(month.getBoundingClientRect().width).toBe(390)
    const cells = cellsOf(grid)
    const total = cells.reduce((sum, cell) => sum + cell.width, 0)
    expect(total).toBeCloseTo(grid.getBoundingClientRect().width, 0)
    expect(grid.getBoundingClientRect().width).toBe(390)
    const rect = day(TODAY).getBoundingClientRect()
    expect(rect.width).toBe(48)
    expect(rect.height).toBe(48)
    const column = day(TODAY).closest('td')!.getBoundingClientRect()
    expect(rect.left - column.left).toBeCloseTo(column.right - rect.right, 0)
  })

  it('spans its container with the month arrows', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} />
      </div>
    )
    const month = document
      .querySelector('[data-slot="calendar-month"]')!
      .getBoundingClientRect()
    const previous = screen
      .getByRole('button', { name: 'Previous month' })
      .getBoundingClientRect()
    const next = screen
      .getByRole('button', { name: 'Next month' })
      .getBoundingClientRect()
    expect(previous.left).toBe(month.left)
    expect(next.right).toBe(month.right)
  })

  it('keeps 40px days in a 280px month where it sizes to its content', () => {
    render(
      <div className='w-fit'>
        <Calendar today={TODAY} />
      </div>
    )
    const rect = day(TODAY).getBoundingClientRect()
    expect([rect.width, rect.height]).toEqual([40, 40])
    const month = document.querySelector('[data-slot="calendar-month"]')!
    expect(month.getBoundingClientRect().width).toBe(280)
  })

  it('keeps two 280px months side by side where it sizes to its content', () => {
    render(
      <div className='w-fit'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const [first, second] = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    expect(first!.width).toBe(280)
    expect(second!.width).toBe(280)
    expect(second!.top).toBe(first!.top)
  })

  it('holds the frame of the month it will show while today is unknown', () => {
    const { rerender } = render(
      <div className='w-97.5'>
        <Calendar fixedWeeks />
      </div>
    )
    const frame = document
      .querySelector('[data-slot="calendar"]')!
      .getBoundingClientRect().height
    rerender(
      <div className='w-97.5'>
        <Calendar fixedWeeks today={TODAY} />
      </div>
    )
    expect(
      document.querySelector('[data-slot="calendar"]')!.getBoundingClientRect()
        .height
    ).toBe(frame)
  })

  it('puts months side by side where they fit', () => {
    render(
      <div className='w-200'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const [first, second] = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    expect(second!.top).toBe(first!.top)
    expect(second!.left).toBeGreaterThan(first!.right)
    expect(second!.right).toBe(800)
  })

  it('stacks months where they do not', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const [first, second] = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    expect(second!.top).toBeGreaterThan(first!.bottom)
    expect(second!.left).toBe(first!.left)
    expect(
      document.querySelector('[data-slot="calendar"]')!.getBoundingClientRect()
        .width
    ).toBeLessThanOrEqual(390)
  })
})

describe('Calendar scrolling months', () => {
  const scroller = () =>
    document.querySelector<HTMLElement>('[data-testid="scroller"]')!
  const weekdays = () =>
    document.querySelector<HTMLElement>('[data-slot="calendar-weekdays"]')!
  const monthsShown = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="calendar-month"]'),
      (month) => month.dataset.month
    )

  function Scrolling(props: Omit<CalendarSingleProps, 'today' | 'layout'>) {
    return (
      <div
        data-testid='scroller'
        className='h-100 w-97.5 overflow-y-auto bg-raised'
      >
        <Calendar today={TODAY} layout='scroll' {...props} />
      </div>
    )
  }

  it('stacks months with no arrows and one weekday row', () => {
    render(<Scrolling />)
    expect(screen.queryByRole('button', { name: 'Next month' })).toBeNull()
    expect(monthsShown().length).toBeGreaterThan(3)
    expect(monthsShown()).toContain('2027-03-01')
    const grids = screen.getAllByRole('grid')
    expect(grids[1]!.getBoundingClientRect().top).toBeGreaterThan(
      grids[0]!.getBoundingClientRect().bottom
    )
    // Each grid keeps its column headers for assistive tech.
    for (const grid of grids)
      expect(grid.querySelectorAll('[role="columnheader"]')).toHaveLength(7)
    expect(weekdays()).toHaveAttribute('aria-hidden', 'true')
    const cells = cellsOf(grids[0]!)
    const total = cells.reduce((sum, cell) => sum + cell.width, 0)
    expect(total).toBeCloseTo(grids[0]!.getBoundingClientRect().width, 0)
  })

  it('opens on the selected month, under the weekday row', async () => {
    render(<Scrolling defaultSelected='2027-06-12' />)
    const june = document.querySelector('[data-month="2027-06-01"]')!
    await expect
      .poll(() => june.getBoundingClientRect().top)
      .toBeCloseTo(weekdays().getBoundingClientRect().bottom, 0)
  })

  it('pins the weekday row, painted over the days, as the months scroll', async () => {
    render(<Scrolling />)
    const top = scroller().getBoundingClientRect().top
    scroller().scrollTop += 300
    await expect
      .poll(() => weekdays().getBoundingClientRect().top)
      .toBeCloseTo(top, 0)
    expect(getComputedStyle(weekdays()).backgroundColor).toBe(
      getComputedStyle(scroller()).backgroundColor
    )
  })

  it('adds months as the list is scrolled to its end', async () => {
    render(<Scrolling />)
    const before = monthsShown().length
    scroller().scrollTop = scroller().scrollHeight
    await expect.poll(() => monthsShown().length).toBeGreaterThan(before)
  })

  it('adds earlier months above without moving what is in view', async () => {
    render(<Scrolling />)
    const first = monthsShown()[0]!
    const march = document.querySelector('[data-month="2027-03-01"]')!
    await expect.poll(() => scroller().scrollTop).toBeGreaterThan(0)
    scroller().scrollTop = 0
    const firstMonth = document.querySelector(`[data-month="${first}"]`)!
    const top = firstMonth.getBoundingClientRect().top
    await expect.poll(() => monthsShown()[0]).not.toBe(first)
    await expect
      .poll(() => firstMonth.getBoundingClientRect().top)
      .toBeCloseTo(top, 0)
    expect(scroller().scrollTop).toBeGreaterThan(0)
    expect(march.isConnected).toBe(true)
  })

  it('moves the keyboard past the last month shown', async () => {
    render(<Scrolling endMonth='2027-12-31' />)
    const last = monthsShown().at(-1)!
    const lastDay = new Date(
      Date.UTC(Number(last.slice(0, 4)), Number(last.slice(5, 7)), 0)
    )
      .toISOString()
      .slice(0, 10)
    const weekOn = new Date(Date.parse(`${lastDay}T12:00:00Z`) + 7 * 86400000)
      .toISOString()
      .slice(0, 10)
    day(lastDay).focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(focused).toBe(weekOn)
  })

  it('keeps a focused day clear of the pinned weekday row', async () => {
    render(<Scrolling defaultSelected='2027-06-02' />)
    const june = document.querySelector('[data-month="2027-06-01"]')!
    await expect
      .poll(() => Math.round(june.getBoundingClientRect().top))
      .toBe(Math.round(weekdays().getBoundingClientRect().bottom))
    day('2027-06-02').focus()
    await userEvent.keyboard('{ArrowUp}')
    await expect.poll(focused).toBe('2027-05-26')
    await expect
      .poll(() => day('2027-05-26').getBoundingClientRect().top)
      .toBeGreaterThanOrEqual(weekdays().getBoundingClientRect().bottom - 1)
  })

  it('stops growing in a box that only scrolls sideways', async () => {
    render(
      <div className='w-97.5 overflow-x-auto'>
        <Calendar today={TODAY} layout='scroll' />
      </div>
    )
    await new Promise((resolve) => setTimeout(resolve, 300))
    const settled = monthsShown().length
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(monthsShown().length).toBe(settled)
    expect(settled).toBeLessThan(40)
  })
})

describe('Calendar under forced colours', () => {
  it('edges chosen and in-range days in Highlight', async (context) => {
    render(
      <>
        <Calendar
          today={TODAY}
          mode='range'
          defaultSelected={{ start: '2027-03-03', end: '2027-03-05' }}
        />
        <span data-probe className='bg-[Canvas]' />
      </>
    )
    await commands.forcedColors(true)
    onTestFinished(() => commands.forcedColors(false))
    if (!matchMedia('(forced-colors: active)').matches) {
      context.skip()
      return
    }
    const canvas = getComputedStyle(
      document.querySelector('[data-probe]')!
    ).backgroundColor
    const edge = (date: string) => getComputedStyle(day(date)).borderTopColor
    for (const date of ['2027-03-03', '2027-03-04', '2027-03-05']) {
      expect(edge(date)).not.toBe(canvas)
      expect(edge(date)).not.toBe(edge('2027-03-20'))
    }
  })
})
