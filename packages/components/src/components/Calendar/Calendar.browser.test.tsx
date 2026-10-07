import { type ReactElement, useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
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
import { commands, userEvent } from 'vitest/browser'

import { Calendar, type CalendarDateRange, type CalendarSingleProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'
import { ScrollArea } from '../ScrollArea'

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

// A page turn lands after its slide out.
const turned = () =>
  expect
    .poll(() => document.querySelector('[data-swiping]'), { timeout: 2000 })
    .toBeNull()

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
    await turned()
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
    await turned()
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
    await turned()
    expect(document.activeElement).toHaveAccessibleName('Previous month')
    await userEvent.tab()
    expect(document.activeElement).toHaveAccessibleName('Next month')
    await userEvent.keyboard('{Enter}{Enter}')
    await turned()
    expect(caption()).toEqual(['April 2027'])
    expect(document.activeElement).toHaveAccessibleName('Next month')
  })

  it('keeps focus on a caption select as it changes the month', async () => {
    render(<Calendar today={TODAY} captionLayout='dropdown' />)
    const month = screen.getByRole('combobox', { name: 'Month' })
    await userEvent.selectOptions(month, 'July')
    await turned()
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

  it('puts the title at the start and both arrows at the end', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} />
      </div>
    )
    const header = document
      .querySelector('[data-slot="calendar-header"]')!
      .getBoundingClientRect()
    const title = screen.getByText('March 2027').getBoundingClientRect()
    const previous = screen
      .getByRole('button', { name: 'Previous month' })
      .getBoundingClientRect()
    const next = screen
      .getByRole('button', { name: 'Next month' })
      .getBoundingClientRect()
    expect(header.width).toBe(390)
    expect(title.left).toBe(header.left)
    expect(next.right).toBe(header.right)
    expect(previous.right).toBeLessThan(next.left)
    expect(previous.left).toBeGreaterThan(title.right)
    expect(previous.top).toBe(next.top)
  })

  it('keeps both arrows at the top end beside several months', () => {
    render(
      <div className='w-200'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const months = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    const next = screen
      .getByRole('button', { name: 'Next month' })
      .getBoundingClientRect()
    const previous = screen
      .getByRole('button', { name: 'Previous month' })
      .getBoundingClientRect()
    expect(next.right).toBe(months[1]!.right)
    expect(next.top).toBe(months[1]!.top)
    expect(previous.left).toBeGreaterThan(months[1]!.left)
    const caption = screen.getByText('April 2027').getBoundingClientRect()
    expect(caption.left).toBe(months[1]!.left)
    expect(caption.right).toBeLessThanOrEqual(previous.left)
  })

  it('puts a stacked first title before the toggle and arrows on one line', async () => {
    render(
      <div className='w-75'>
        <Calendar
          today={TODAY}
          defaultMonth='2027-09-01'
          numberOfMonths={2}
          views={['week', 'month']}
        />
      </div>
    )
    const toggle = screen
      .getByRole('group', { name: 'View' })
      .getBoundingClientRect()
    const caption = await screen.findByText('September 2027', {
      ignore: '[aria-hidden="true"]'
    })
    await expect
      .poll(() => caption.closest('[data-slot="calendar-header"]'))
      .not.toBeNull()
    expect(caption.getBoundingClientRect().right).toBeLessThanOrEqual(
      toggle.left
    )
    expect(caption.getBoundingClientRect().top).toBeLessThan(toggle.bottom)
    expect(caption.scrollWidth).toBeLessThanOrEqual(caption.clientWidth)
  })

  it('puts the arrows in a row above stacked months, at the end', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const first = document
      .querySelector('[data-slot="calendar-month"]')!
      .getBoundingClientRect()
    const next = screen
      .getByRole('button', { name: 'Next month' })
      .getBoundingClientRect()
    expect(next.bottom).toBeLessThanOrEqual(first.top)
    expect(next.right).toBe(first.right)
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

  // The server doesn't know today, so its HTML is the placeholder.
  function serverHeight(width: string, calendar: ReactElement) {
    const host = document.createElement('div')
    host.className = width
    document.body.append(host)
    host.innerHTML = renderToString(calendar)
    const height = host
      .querySelector('[data-slot="calendar"]')!
      .getBoundingClientRect().height
    host.remove()
    return height
  }

  const price = () => '$29'
  it.each([
    ['a month', 'w-97.5', { fixedWeeks: true, showOutsideDays: true }, 4],
    ['a week', 'w-97.5', { view: 'week' }, 4],
    ['a capped week', 'w-200', { view: 'week' }, 4],
    [
      'a month of tiles',
      'w-200',
      { fixedWeeks: true, showOutsideDays: true, getDayContent: price },
      4
    ],
    [
      'several months side by side with a toggle',
      'w-320',
      {
        fixedWeeks: true,
        showOutsideDays: true,
        numberOfMonths: 2,
        views: ['month', 'week']
      },
      4
    ]
  ] as const)(
    'holds the frame of %s while today is unknown',
    (_, width, props, tolerance) => {
      const frame = serverHeight(
        width,
        <Calendar {...(props as CalendarSingleProps)} />
      )
      render(
        <div className={width}>
          <Calendar {...(props as CalendarSingleProps)} today={TODAY} />
        </div>
      )
      const height = document
        .querySelector('[data-slot="calendar"]')!
        .getBoundingClientRect().height
      expect(Math.abs(height - frame)).toBeLessThan(tolerance)
    }
  )

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

describe('Calendar day tiles', () => {
  const price = (date: string) =>
    date === '2027-03-04' ? (
      <>
        <span>$29</span>
        <span>4 sessions</span>
      </>
    ) : date === '2027-03-05' ? (
      '$35'
    ) : null

  it('grows a row of tiles to fit the tallest content', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} getDayContent={price} />
      </div>
    )
    const tall = day('2027-03-04').getBoundingClientRect()
    const short = day('2027-03-05').getBoundingClientRect()
    const plain = day('2027-03-01').getBoundingClientRect()
    expect(tall.height).toBeGreaterThan(tall.width)
    const content = day('2027-03-04')
      .querySelector('[data-slot="calendar-day-content"]')!
      .getBoundingClientRect()
    expect(content.bottom).toBeLessThanOrEqual(tall.bottom)
    const row = (date: string) =>
      day(date).closest('td')!.getBoundingClientRect().height
    expect(row('2027-03-05')).toBe(row('2027-03-04'))
    expect(short.width).toBeCloseTo(tall.width, 1)
    expect(plain.width).toBeCloseTo(tall.width, 1)
  })

  it('caps tiles in a wide calendar, centred in their columns', () => {
    render(
      <div className='w-200'>
        <Calendar today={TODAY} view='week' />
      </div>
    )
    const rect = day(TODAY).getBoundingClientRect()
    const column = day(TODAY).closest('td')!.getBoundingClientRect()
    expect(rect.width).toBe(80)
    expect(rect.left - column.left).toBeCloseTo(column.right - rect.right, 0)
  })

  it('gives every day a tile once days can have content, plain ones unfilled', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} getDayContent={() => null} />
      </div>
    )
    expect(document.querySelector('[data-slot="calendar"]')).toHaveAttribute(
      'data-tiles'
    )
    const rect = day(TODAY).getBoundingClientRect()
    expect(rect.height).toBeCloseTo(rect.width, 0)
  })

  it('draws a week as a row of tiles taller than they are wide', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} view='week' />
      </div>
    )
    const rect = day(TODAY).getBoundingClientRect()
    expect(rect.width).toBeGreaterThan(48)
    expect(rect.height).toBeGreaterThan(rect.width)
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  it('fits the view toggle beside a long title in a phone-sized month', () => {
    render(
      <div className='w-75'>
        <Calendar
          today={TODAY}
          view='week'
          defaultMonth='2026-11-01'
          views={['week', 'month']}
        />
      </div>
    )
    const header = document
      .querySelector('[data-slot="calendar-header"]')!
      .getBoundingClientRect()
    const next = screen
      .getByRole('button', { name: 'Next week' })
      .getBoundingClientRect()
    const previous = screen
      .getByRole('button', { name: 'Previous week' })
      .getBoundingClientRect()
    const toggle = screen
      .getByRole('group', { name: 'View' })
      .getBoundingClientRect()
    // Short month names, where the full ones would be cut off.
    const title = screen.getByText('Oct to Nov 2026')
    expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth)
    expect(title.getBoundingClientRect().left).toBe(header.left)
    expect(toggle.left).toBeGreaterThanOrEqual(
      title.getBoundingClientRect().right
    )
    expect(toggle.right).toBeLessThan(previous.left)
    expect(next.right).toBe(header.right)
    expect(header.height).toBe(32)
  })
})

// A view switch renders as a transition, then eases in.
async function viewSettled(view: 'week' | 'month') {
  const root = () => document.querySelector('[data-slot="calendar"]')!
  await expect.poll(() => root().getAttribute('data-view')).toBe(view)
  await expect.poll(() => root().hasAttribute('data-swiping')).toBe(false)
}

describe('Calendar views', () => {
  it.each([
    { width: 1280, labelled: true },
    { width: 390, labelled: false },
    { width: 320, labelled: false }
  ])(
    'switches view on one header row at $width px, labelled: $labelled',
    async ({ width, labelled }) => {
      render(
        <div style={{ width }}>
          <Calendar
            today={TODAY}
            defaultView='week'
            views={['week', 'month']}
          />
        </div>
      )
      const header = document
        .querySelector('[data-slot="calendar-header"]')!
        .getBoundingClientRect()
      expect(header.height).toBe(32)
      for (const button of within(
        document.querySelector<HTMLElement>('[data-slot="calendar-header"]')!
      ).getAllByRole('button')) {
        const box = button.getBoundingClientRect()
        expect(box.top).toBeGreaterThanOrEqual(header.top)
        expect(box.bottom).toBeLessThanOrEqual(header.bottom)
      }
      for (const name of ['Week', 'Month']) {
        const item = within(
          screen.getByRole('group', { name: 'View' })
        ).getByRole('button', { name })
        const label = within(item).getByText(name)
        const box = item.getBoundingClientRect()
        if (labelled) {
          expect(label).toBeVisible()
          expect(box.width).toBeGreaterThan(box.height)
        } else {
          expect(label).not.toBeVisible()
          expect(box.width).toBeCloseTo(box.height, 0)
        }
      }
      await userEvent.click(screen.getByRole('button', { name: 'Month' }))
      await viewSettled('month')
      expect(screen.getByRole('grid')).toHaveAccessibleName('March 2027')
      expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    }
  )
})

describe('Calendar arrows with several months', () => {
  it.each(['w-97.5', 'w-320'])(
    'turn the page when clicked at %s',
    async (width) => {
      render(
        <div className={width}>
          <Calendar today={TODAY} numberOfMonths={2} />
        </div>
      )
      await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
      await turned()
      expect(caption()).toEqual(['April 2027', 'May 2027'])
      await userEvent.click(
        screen.getByRole('button', { name: 'Previous month' })
      )
      await turned()
      expect(caption()).toEqual(['March 2027', 'April 2027'])
    }
  )
})

describe('Calendar turning up and down', () => {
  const swiping = () => document.querySelector('[data-swiping]')

  // Long slides, held partway through the slide in after the midpoint swap.
  async function holdMidTurn() {
    const animate = Element.prototype.animate
    const spy = vi
      .spyOn(Element.prototype, 'animate')
      .mockImplementation(function (this: Element, frames, options) {
        return animate.call(this, frames, {
          ...(options as object),
          duration: 60_000
        })
      })
    onTestFinished(() => spy.mockRestore())
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    for (const animation of document.getAnimations())
      animation.currentTime = 30_000
    expect(swiping()).not.toBeNull()
  }

  // Every point across the title, arrows and weekday row, a few pixels apart.
  function nothingButStillParts() {
    const header = document
      .querySelector('[data-slot="calendar-header"]')!
      .getBoundingClientRect()
    const weekdays = document
      .querySelector('[data-slot="calendar-weekdays"]')!
      .getBoundingClientRect()
    const viewport = document
      .querySelector('[data-slot="calendar-months"]')!
      .getBoundingClientRect()
    expect(weekdays.top).toBeGreaterThanOrEqual(header.bottom)
    expect(viewport.top).toBeGreaterThanOrEqual(weekdays.bottom - 0.5)
    for (const box of [header, weekdays])
      for (let x = box.left + 2; x < box.right; x += 6)
        for (let y = box.top + 1; y < box.bottom; y += 4) {
          const hit = document.elementFromPoint(x, y)
          expect(hit?.closest('td, [data-date]') ?? null).toBeNull()
        }
    for (const cell of document.querySelectorAll('[data-slot="calendar"] td')) {
      const box = cell.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      const hit = document.elementFromPoint(x, y)
      if (hit && cell.contains(hit)) {
        expect(y).toBeGreaterThanOrEqual(viewport.top)
        expect(y).toBeLessThanOrEqual(viewport.bottom)
      }
    }
  }

  it('keeps every day below the header and weekday row mid-turn on one page', async () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} direction='vertical' />
      </div>
    )
    await holdMidTurn()
    nothingButStillParts()
  })

  it('keeps every day below the header and weekday row mid-turn for stacked months', async () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    await expect
      .poll(() =>
        document
          .querySelector('[data-slot="calendar"]')!
          .getAttribute('data-paging')
      )
      .toBe('vertical')
    await holdMidTurn()
    nothingButStillParts()
  })

  it("puts the first stacked month's title on the arrows' line", async () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    await expect
      .poll(() =>
        document
          .querySelector('[data-slot="calendar"]')!
          .getAttribute('data-paging')
      )
      .toBe('vertical')
    const header = document.querySelector<HTMLElement>(
      '[data-slot="calendar-header"]'
    )!
    expect(header).toHaveTextContent('March 2027')
    const title = within(header).getByText('March 2027').getBoundingClientRect()
    const next = screen
      .getByRole('button', { name: 'Next month' })
      .getBoundingClientRect()
    expect(title.top + title.height / 2).toBeCloseTo(
      next.top + next.height / 2,
      0
    )
    expect(screen.getAllByText('April 2027')).toHaveLength(1)
    expect(screen.getAllByRole('grid')[0]).toHaveAccessibleName('March 2027')
    expect(screen.getAllByRole('grid')[1]).toHaveAccessibleName('April 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    await turned()
    expect(header).toHaveTextContent('April 2027')
  })
})

describe('Calendar pages up and down once several months stack', () => {
  const root = () => document.querySelector('[data-slot="calendar"]')!
  const grid = () => document.querySelector('[data-slot="calendar-grid"]')!

  it('turns vertically while stacked and back when they fit side by side', async () => {
    const { rerender } = render(
      <div className='w-97.5'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    await expect.poll(() => root().getAttribute('data-paging')).toBe('vertical')
    expect(getComputedStyle(grid()).touchAction).toMatch(/pan-x/)
    expect(root()).toHaveAttribute('data-direction', 'horizontal')
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    await turned()
    expect(caption()).toEqual(['April 2027', 'May 2027'])
    rerender(
      <div className='w-320'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    await expect
      .poll(() => root().getAttribute('data-paging'))
      .toBe('horizontal')
    expect(getComputedStyle(grid()).touchAction).toMatch(/pan-y/)
  })

  it('stacks by the months it holds at a larger root text size', async () => {
    document.documentElement.style.fontSize = '20px'
    onTestFinished(() => {
      document.documentElement.style.fontSize = ''
    })
    render(
      <div style={{ width: 650 }}>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    await expect.poll(() => root().getAttribute('data-paging')).toBe('vertical')
  })

  it('puts several vertical months in one column however wide', () => {
    render(
      <div className='w-320'>
        <Calendar today={TODAY} numberOfMonths={2} direction='vertical' />
      </div>
    )
    const [first, second] = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    expect(second!.top).toBeGreaterThan(first!.bottom)
  })

  it('puts wrapping months in one column as they turn up and down', async () => {
    render(
      <div className='w-200'>
        <Calendar today={TODAY} numberOfMonths={4} />
      </div>
    )
    await expect
      .poll(() =>
        document
          .querySelector('[data-slot="calendar"]')!
          .getAttribute('data-paging')
      )
      .toBe('vertical')
    const boxes = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    boxes.slice(1).forEach((box, i) => {
      expect(box.top).toBeGreaterThan(boxes[i]!.bottom)
    })
  })

  it('keeps one month horizontal however narrow', async () => {
    render(
      <div className='w-75'>
        <Calendar today={TODAY} />
      </div>
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(root()).toHaveAttribute('data-paging', 'horizontal')
  })
})

describe('Calendar page turns', () => {
  const days = () =>
    document.querySelector<HTMLElement>('[data-slot="calendar-days"]')!
  const weekdays = () =>
    document.querySelector('[data-slot="calendar-grid"] thead')!
  const swiping = () => document.querySelector('[data-swiping]')

  // Slides that last until finished by hand, so a press lands mid-slide.
  function holdSlides() {
    const animate = Element.prototype.animate
    const spy = vi
      .spyOn(Element.prototype, 'animate')
      .mockImplementation(function (this: Element, frames, options) {
        return animate.call(this, frames, {
          ...(options as object),
          duration: 60_000
        })
      })
    onTestFinished(() => spy.mockRestore())
    return {
      firstFrames: () =>
        (spy.mock.calls[0]![0] as { transform?: string }[]).map(
          (frame) => frame.transform
        ),
      async land() {
        for (let i = 0; i < 20 && swiping(); i++) {
          for (const animation of document.getAnimations()) animation.finish()
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }
    }
  }

  it('slides the days, not the weekday row, as the arrows turn the page', async () => {
    const slides = holdSlides()
    render(<Calendar today={TODAY} />)
    const row = weekdays().getBoundingClientRect().toJSON()
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(swiping()).not.toBeNull()
    expect(slides.firstFrames().at(-1)).toMatch(/^translate3d\(-\d/)
    expect(weekdays().getBoundingClientRect().toJSON()).toEqual(row)
    await slides.land()
    expect(caption()).toEqual(['April 2027'])
    expect(days().style.transform).toBe('')
  })

  it('ends on the right month when clicked again mid-slide, keeping focus', async () => {
    const slides = holdSlides()
    render(<Calendar today={TODAY} />)
    const next = screen.getByRole('button', { name: 'Next month' })
    await userEvent.click(next)
    expect(swiping()).not.toBeNull()
    await userEvent.click(next)
    expect(swiping()).not.toBeNull()
    await userEvent.click(next)
    await slides.land()
    expect(caption()).toEqual(['June 2027'])
    expect(next).toHaveFocus()
    expect(days().getAnimations()).toHaveLength(0)
  })

  it.each([
    ['vertical', 'ltr', /^translate3d\(0, -\d/],
    ['horizontal', 'rtl', /^translate3d\(\d/]
  ] as const)(
    'slides the way a %s %s swipe would',
    async (direction, dir, frame) => {
      const slides = holdSlides()
      render(
        <div dir={dir}>
          <Calendar today={TODAY} direction={direction} />
        </div>
      )
      await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
      expect(slides.firstFrames().at(-1)).toMatch(frame)
      await slides.land()
    }
  )

  it('turns straight away when motion is reduced', async () => {
    await commands.reduceMotion(true)
    onTestFinished(() => commands.reduceMotion(false))
    render(<Calendar today={TODAY} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(caption()).toEqual(['April 2027'])
    expect(days().getAnimations()).toHaveLength(0)
    expect(getComputedStyle(days()).transform).toBe('none')
  })

  it('switches view straight away when motion is reduced', async () => {
    await commands.reduceMotion(true)
    onTestFinished(() => commands.reduceMotion(false))
    render(<Calendar today={TODAY} views={['week', 'month']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Week' }))
    await expect.poll(() => screen.getAllByRole('gridcell').length).toBe(7)
    expect(swiping()).toBeNull()
    expect(document.getAnimations()).toHaveLength(0)
    expect(document.querySelector('[data-leaving]')).toBeNull()
  })

  it('keeps focus on the views and leaves nothing behind as they switch', async () => {
    render(<Calendar today={TODAY} views={['week', 'month']} />)
    const week = screen.getByRole('button', { name: 'Week' })
    await userEvent.click(week)
    expect(week).toHaveFocus()
    await expect.poll(swiping).not.toBeNull()
    await expect.poll(swiping).toBeNull()
    expect(week).toHaveFocus()
    expect(document.querySelector('[data-leaving]')).toBeNull()
    expect(document.getAnimations()).toHaveLength(0)
    expect(screen.getAllByRole('gridcell').length).toBe(7)
  })

  it('slides for Page Down but not for an arrow across the month', async () => {
    const slides = holdSlides()
    render(<Calendar today='2027-03-31' />)
    await tabIntoGrid()
    await userEvent.keyboard('{ArrowRight}')
    expect(swiping()).toBeNull()
    expect(caption()).toEqual(['April 2027'])
    await userEvent.keyboard('{PageDown}')
    expect(swiping()).not.toBeNull()
    await slides.land()
    expect(focused()).toBe('2027-05-01')
  })

  it('reaches a month for every quick Page Down', async () => {
    const slides = holdSlides()
    render(<Calendar today={TODAY} />)
    await tabIntoGrid()
    await userEvent.keyboard('{PageDown}{PageDown}{PageDown}')
    await slides.land()
    expect(focused()).toBe('2027-06-10')
    expect(caption()).toEqual(['June 2027'])
  })

  it('reaches the last month with quick Page Downs and moves on from there', async () => {
    const slides = holdSlides()
    render(<Calendar today={TODAY} numberOfMonths={2} endMonth='2027-05-01' />)
    await tabIntoGrid()
    await userEvent.keyboard('{PageDown}')
    expect(focused()).toBe('2027-04-10')
    await userEvent.keyboard('{PageDown}{PageDown}')
    await slides.land()
    expect(focused()).toBe('2027-05-31')
    await userEvent.keyboard('{ArrowLeft}')
    expect(focused()).toBe('2027-05-30')
    await userEvent.keyboard('{PageUp}')
    await slides.land()
    expect(focused()).toBe('2027-04-30')
  })

  it('lands a Page Down turn before an arrow moves on from it', async () => {
    holdSlides()
    render(<Calendar today={TODAY} />)
    await tabIntoGrid()
    await userEvent.keyboard('{PageDown}')
    expect(swiping()).not.toBeNull()
    await userEvent.keyboard('{ArrowRight}')
    expect(swiping()).toBeNull()
    expect(focused()).toBe('2027-04-11')
    expect(days().getAnimations()).toHaveLength(0)
  })

  it('shows a month picked from the select at once, then slides it in', async () => {
    holdSlides()
    render(<Calendar today={TODAY} captionLayout='dropdown' />)
    const month = screen.getByRole('combobox', { name: 'Month' })
    await userEvent.selectOptions(month, 'July')
    expect(caption()).toEqual(['July 2027'])
    expect(month).toHaveValue('7')
    expect(swiping()).not.toBeNull()
  })

  it('drops a turn still sliding out when the calendar closes', async () => {
    holdSlides()
    const onMonthChange = vi.fn()
    const { unmount } = render(
      <Calendar today={TODAY} onMonthChange={onMonthChange} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    unmount()
    expect(onMonthChange).not.toHaveBeenCalled()
  })

  it('lands the turn when a controlled parent follows it', async () => {
    holdSlides()
    function Controlled() {
      const [month, setMonth] = useState('2027-03-01')
      return <Calendar today={TODAY} month={month} onMonthChange={setMonth} />
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    for (const animation of document.getAnimations()) animation.finish()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(caption()).toEqual(['April 2027'])
    expect(swiping()).toBeNull()
    expect(days().getAnimations()).toHaveLength(0)
  })

  it('drops a waiting turn when the parent moves the month mid-slide', async () => {
    const slides = holdSlides()
    const onMonthChange = vi.fn()
    const { rerender } = render(
      <Calendar
        today={TODAY}
        month='2027-03-01'
        onMonthChange={onMonthChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(swiping()).not.toBeNull()
    rerender(
      <Calendar
        today={TODAY}
        month='2027-01-01'
        onMonthChange={onMonthChange}
      />
    )
    await slides.land()
    expect(caption()).toEqual(['January 2027'])
    expect(onMonthChange).not.toHaveBeenCalled()
  })

  it.each([
    [
      'Shift and Page Down in month view',
      {},
      '{Shift>}{PageDown}{/Shift}',
      '2028-03-10'
    ],
    [
      'Page Down in week view',
      { view: 'week' as const },
      '{PageDown}',
      '2027-04-10'
    ]
  ])(
    'turns at once for %s, which skips past the page beside',
    async (_, props, keys, expected) => {
      holdSlides()
      render(<Calendar today={TODAY} {...props} />)
      await tabIntoGrid()
      await userEvent.keyboard(keys)
      expect(swiping()).toBeNull()
      expect(document.querySelector('[data-peek]')).toBeNull()
      expect(focused()).toBe(expected)
    }
  )

  it('takes the incoming page away when the calendar is disabled mid-slide', async () => {
    holdSlides()
    const { rerender } = render(<Calendar today={TODAY} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(document.querySelector('[data-peek]')).not.toBeNull()
    rerender(<Calendar today={TODAY} disabled />)
    expect(document.querySelector('[data-peek]')).toBeNull()
  })

  it('keeps a month that stays shown still as stacked months of different heights turn', async () => {
    holdSlides()
    render(
      <div className='w-97.5'>
        <Calendar today='2027-02-10' numberOfMonths={2} />
      </div>
    )
    await expect
      .poll(() =>
        document
          .querySelector('[data-slot="calendar"]')!
          .getAttribute('data-paging')
      )
      .toBe('vertical')
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    for (const animation of document.getAnimations()) animation.finish()
    const before = day('2027-03-01').getBoundingClientRect().top
    await new Promise((resolve) => setTimeout(resolve, 0))
    // Where the slide in starts, however long the swap took to land.
    for (const animation of document.getAnimations()) animation.currentTime = 0
    expect(caption()).toEqual(['March 2027', 'April 2027'])
    expect(day('2027-03-01').getBoundingClientRect().top).toBeCloseTo(before, 0)
  })

  it('keeps a month that stays shown still as stacked months turn back', async () => {
    holdSlides()
    render(
      <div className='w-97.5'>
        <Calendar today='2027-03-10' numberOfMonths={2} />
      </div>
    )
    await expect
      .poll(() =>
        document
          .querySelector('[data-slot="calendar"]')!
          .getAttribute('data-paging')
      )
      .toBe('vertical')
    await userEvent.click(
      screen.getByRole('button', { name: 'Previous month' })
    )
    for (const animation of document.getAnimations()) animation.finish()
    const before = day('2027-03-01').getBoundingClientRect().top
    await new Promise((resolve) => setTimeout(resolve, 0))
    // Where the slide in starts, however long the swap took to land.
    for (const animation of document.getAnimations()) animation.currentTime = 0
    expect(caption()).toEqual(['February 2027', 'March 2027'])
    expect(day('2027-03-01').getBoundingClientRect().top).toBeCloseTo(before, 0)
  })

  it('slides a whole month along in a right-to-left row', async () => {
    const slides = holdSlides()
    render(
      <div dir='rtl' className='w-200'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const months = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    const step = Math.abs(months[0]!.left - months[1]!.left)
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    const landing = Number(
      /translate3d\((-?[\d.]+)px/.exec(slides.firstFrames().at(-1)!)![1]
    )
    expect(landing).toBeCloseTo(step, 0)
    await slides.land()
  })

  it('keeps a month that stays shown still in a right-to-left row', async () => {
    holdSlides()
    render(
      <div dir='rtl' className='w-200'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    for (const animation of document.getAnimations()) animation.finish()
    const before = day('2027-04-01').getBoundingClientRect().left
    await new Promise((resolve) => setTimeout(resolve, 0))
    // Where the slide in starts, however long the swap took to land.
    for (const animation of document.getAnimations()) animation.currentTime = 0
    expect(caption()).toEqual(['April 2027', 'May 2027'])
    expect(day('2027-04-01').getBoundingClientRect().left).toBeCloseTo(
      before,
      0
    )
  })

  it('keeps a waiting turn when the parent names another day of the same month', async () => {
    const slides = holdSlides()
    const onMonthChange = vi.fn()
    const { rerender } = render(
      <Calendar
        today={TODAY}
        month='2027-03-01'
        onMonthChange={onMonthChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    rerender(
      <Calendar
        today={TODAY}
        month='2027-03-15'
        onMonthChange={onMonthChange}
      />
    )
    await slides.land()
    expect(onMonthChange).toHaveBeenLastCalledWith('2027-04-01')
  })

  it('keeps stacked months sliding clear of the arrows', async () => {
    holdSlides()
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    await expect
      .poll(() =>
        document
          .querySelector('[data-slot="calendar"]')!
          .getAttribute('data-paging')
      )
      .toBe('vertical')
    const next = screen.getByRole('button', { name: 'Next month' })
    await userEvent.click(next)
    for (const animation of document.getAnimations()) animation.finish()
    await new Promise((resolve) => setTimeout(resolve, 0))
    for (const animation of document.getAnimations())
      animation.currentTime = 100
    const box = next.getBoundingClientRect()
    const months = document
      .querySelector('[data-slot="calendar-months"]')!
      .getBoundingClientRect()
    expect(box.bottom).toBeLessThanOrEqual(months.top)
    expect(
      next.contains(
        document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2
        )
      )
    ).toBe(true)
  })

  it('slides a column of months in as one when a month is picked', async () => {
    const animate = Element.prototype.animate
    const spy = vi
      .spyOn(Element.prototype, 'animate')
      .mockImplementation(function (this: Element, frames, options) {
        return animate.call(this, frames, {
          ...(options as object),
          duration: 60_000
        })
      })
    onTestFinished(() => spy.mockRestore())
    render(
      <Calendar
        today={TODAY}
        direction='vertical'
        numberOfMonths={2}
        captionLayout='dropdown'
      />
    )
    await userEvent.selectOptions(
      screen.getAllByRole('combobox', { name: 'Month' })[0]!,
      'May'
    )
    const starts = spy.mock.calls.map(
      ([frames]) => (frames as { transform?: string }[])[0]!.transform
    )
    expect(starts.length).toBeGreaterThan(1)
    expect(new Set(starts).size).toBe(1)
  })

  it('turns straight away when a parent moves the month', () => {
    const { rerender } = render(<Calendar today={TODAY} month='2027-03-01' />)
    rerender(<Calendar today={TODAY} month='2027-04-01' />)
    expect(swiping()).toBeNull()
    expect(caption()).toEqual(['April 2027'])
  })
})

describe('Calendar dragged with a mouse', () => {
  const centre = (date: string) => {
    const box = day(date).getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }

  it.each([
    ['horizontal', -120, 0],
    ['vertical', 0, -120]
  ] as const)(
    'turns the page on a %s drag and chooses nothing',
    async (direction, dx, dy) => {
      await commands.parkPointer()
      const onSelect = vi.fn()
      render(
        <Calendar today={TODAY} direction={direction} onSelect={onSelect} />
      )
      const { x, y } = centre('2027-03-17')
      await commands.pointer([
        { type: 'move', x, y },
        { type: 'down' },
        { type: 'move', x: x + dx / 4, y: y + dy / 4, steps: 3 },
        { type: 'move', x: x + dx, y: y + dy, steps: 6 }
      ])
      expect(document.querySelector('[data-swiping]')).not.toBeNull()
      expect(
        getComputedStyle(document.querySelector('[data-slot="calendar"]')!)
          .userSelect
      ).toBe('none')
      await commands.pointer([{ type: 'up' }])
      await turned()
      expect(caption()).toEqual(['April 2027'])
      expect(onSelect).not.toHaveBeenCalled()
      expect(getSelection()?.toString()).toBe('')
    }
  )

  it('chooses nothing when a drag comes back to the day it began on', async () => {
    await commands.parkPointer()
    const onSelect = vi.fn()
    render(<Calendar today={TODAY} onSelect={onSelect} />)
    const { x, y } = centre('2027-03-17')
    await commands.pointer([
      { type: 'move', x, y },
      { type: 'down' },
      { type: 'move', x: x - 40, y, steps: 4 },
      { type: 'move', x, y, steps: 4 },
      { type: 'up' }
    ])
    await turned()
    expect(onSelect).not.toHaveBeenCalled()
    expect(caption()).toEqual(['March 2027'])
  })

  it('leaves the next click alone after a press released outside', async () => {
    await commands.parkPointer()
    const onSelect = vi.fn()
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} onSelect={onSelect} />
      </div>
    )
    const { x, y } = centre('2027-03-14')
    await commands.pointer([
      { type: 'move', x, y },
      { type: 'down' },
      { type: 'move', x: x + 300, y },
      { type: 'up' }
    ])
    const target = centre('2027-03-17')
    await commands.pointer([
      { type: 'move', x: target.x, y: target.y, steps: 6 },
      { type: 'down' },
      { type: 'up' }
    ])
    expect(onSelect).toHaveBeenLastCalledWith('2027-03-17')
    expect(caption()).toEqual(['March 2027'])
  })

  it('keeps focus in the calendar after a drag turns the page', async () => {
    await commands.parkPointer()
    render(<Calendar today={TODAY} />)
    const { x, y } = centre('2027-03-17')
    await commands.pointer([
      { type: 'move', x, y },
      { type: 'down' },
      { type: 'move', x: x - 120, y, steps: 6 },
      { type: 'up' }
    ])
    await turned()
    expect(caption()).toEqual(['April 2027'])
    expect(
      document
        .querySelector('[data-slot="calendar"]')!
        .contains(document.activeElement)
    ).toBe(true)
    const before = focused()
    await userEvent.keyboard('{ArrowRight}')
    expect(focused()).not.toBe(before)
  })

  it('chooses the day on a press that barely moves', async () => {
    await commands.parkPointer()
    const onSelect = vi.fn()
    render(<Calendar today={TODAY} onSelect={onSelect} />)
    const { x, y } = centre('2027-03-17')
    await commands.pointer([
      { type: 'move', x, y },
      { type: 'down' },
      { type: 'move', x: x - 4, y, steps: 2 },
      { type: 'up' }
    ])
    expect(onSelect).toHaveBeenLastCalledWith('2027-03-17')
    expect(caption()).toEqual(['March 2027'])
    expect(document.querySelector('[data-swiping]')).toBeNull()
  })

  it('still chooses a range by clicks, with its preview', async () => {
    const onSelect = vi.fn()
    render(<Calendar mode='range' today={TODAY} onSelect={onSelect} />)
    await userEvent.click(day('2027-03-10'))
    await userEvent.hover(day('2027-03-13'))
    expect(day('2027-03-12')).toHaveAttribute('data-range-preview')
    await userEvent.click(day('2027-03-13'))
    expect(onSelect).toHaveBeenLastCalledWith({
      start: '2027-03-10',
      end: '2027-03-13'
    })
  })
})

describe('Calendar touch-action', () => {
  it.each([
    ['horizontal', /pan-y/],
    ['vertical', /pan-x/]
  ] as const)(
    'lets the page pan only across a %s swipe over the days',
    (direction, pan) => {
      render(<Calendar today={TODAY} direction={direction} />)
      const grid = document.querySelector('[data-slot="calendar-grid"]')!
      const action = getComputedStyle(grid).touchAction
      expect(action).toMatch(pan)
      expect(action).toMatch(/pinch-zoom/)
      expect(action).not.toMatch(direction === 'vertical' ? /pan-y/ : /pan-x/)
      expect(
        getComputedStyle(
          document.querySelector('[data-slot="calendar-header"]')!
        ).touchAction
      ).toBe('auto')
    }
  )

  it('leaves a scrolling list to the page', () => {
    render(<Calendar today={TODAY} layout='scroll' direction='vertical' />)
    expect(
      getComputedStyle(document.querySelector('[data-slot="calendar-grid"]')!)
        .touchAction
    ).toBe('auto')
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

  it('reports the month at the top as it scrolls', async () => {
    const months: string[] = []
    render(<Scrolling onMonthChange={(month) => months.push(month)} />)
    await expect.poll(() => scroller().scrollTop).toBeGreaterThan(0)
    scroller().scrollTop += 700
    await expect.poll(() => months.at(-1)).toMatch(/^2027-0[4-9]-01$/)
  })

  it('stays where it is scrolled when the parent keeps month', async () => {
    function Fixed() {
      const [, setHovered] = useState(0)
      return (
        <div
          data-testid='scroller'
          className='h-100 w-97.5 overflow-y-auto bg-raised'
          onPointerOver={() => setHovered((n) => n + 1)}
        >
          <Calendar today={TODAY} layout='scroll' month='2027-03-01' />
        </div>
      )
    }
    render(<Fixed />)
    await expect.poll(() => scroller().scrollTop).toBeGreaterThan(0)
    const opened = scroller().scrollTop
    scroller().scrollTop = opened + 700
    await new Promise((resolve) => setTimeout(resolve, 100))
    await userEvent.hover(day('2027-05-12'))
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(scroller().scrollTop).toBeGreaterThan(opened + 300)
  })

  it('keeps its months in place as it scrolls after a far jump', async () => {
    function Jumping() {
      const [month, setMonth] = useState('2027-03-01')
      return (
        <>
          <button type='button' onClick={() => setMonth('2029-03-01')}>
            Jump
          </button>
          <div
            data-testid='scroller'
            className='h-100 w-97.5 overflow-y-auto bg-raised'
          >
            <Calendar
              today={TODAY}
              layout='scroll'
              month={month}
              onMonthChange={setMonth}
            />
          </div>
        </>
      )
    }
    render(<Jumping />)
    await expect.poll(() => scroller().scrollTop).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Jump' }))
    await expect.poll(() => monthsShown()).toContain('2029-03-01')
    const first = monthsShown()[0]
    scroller().scrollTop += 500
    await new Promise((resolve) => setTimeout(resolve, 200))
    scroller().scrollTop += 500
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(monthsShown()[0]).toBe(first)
  })

  it('ends a range in a month scrolled to while the parent controls month', async () => {
    function Controlled() {
      const [month, setMonth] = useState('2027-03-01')
      const [range, setRange] = useState<CalendarDateRange>({
        start: null,
        end: null
      })
      return (
        <div
          data-testid='scroller'
          className='h-100 w-97.5 overflow-y-auto bg-raised'
        >
          <Calendar
            today={TODAY}
            layout='scroll'
            mode='range'
            month={month}
            onMonthChange={setMonth}
            selected={range}
            onSelect={setRange}
          />
        </div>
      )
    }
    render(<Controlled />)
    await expect.poll(() => scroller().scrollTop).toBeGreaterThan(0)
    await userEvent.click(day('2027-03-03'))
    const april = document.querySelector('[data-month="2027-04-01"]')!
    scroller().scrollTop +=
      april.getBoundingClientRect().top -
      weekdays().getBoundingClientRect().bottom
    await new Promise((resolve) => setTimeout(resolve, 300))
    await userEvent.click(day('2027-04-05'))
    expect(day('2027-03-03')).toHaveAttribute('data-range-start')
    expect(day('2027-04-05')).toHaveAttribute('data-range-end')
  })

  it('runs its pinned row to the box edges when pulled out of the padding', () => {
    render(
      <div
        data-testid='scroller'
        className='h-100 w-97.5 overflow-y-auto bg-raised'
      >
        <Calendar
          today={TODAY}
          layout='scroll'
          className='px-4 **:data-[slot=calendar-weekdays]:-mx-4 **:data-[slot=calendar-weekdays]:px-4'
        />
      </div>
    )
    const row = weekdays().getBoundingClientRect()
    const box = scroller().getBoundingClientRect()
    expect([row.left, row.right]).toEqual([box.left, box.left + 390])
    const labels = Array.from(weekdays().children, (label) =>
      label.getBoundingClientRect()
    )
    const cells = cellsOf(screen.getAllByRole('grid')[0]!)
    labels.forEach((label, i) =>
      expect(label.left + label.width / 2).toBeCloseTo(
        cells[i]!.left + cells[i]!.width / 2,
        0
      )
    )
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

describe('Calendar titles between stacked months', () => {
  const boxes = (selector: string) =>
    Array.from(document.querySelectorAll(selector), (element) =>
      element.getBoundingClientRect()
    )
  const meets = (a: DOMRect, b: DOMRect) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

  // Every title shown in the column sits clear of the days, the same room
  // above and below it whatever the rows of the month before.
  function titlesSitInTheirGaps() {
    const titles = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="calendar-months"] [data-slot="calendar-month"] > .absolute, [data-peek] > .absolute'
      )
    ).filter((title) => getComputedStyle(title).visibility === 'visible')
    const cells = boxes('[data-slot="calendar-days"] td')
    const rows = boxes('[data-slot="calendar-days"] tr')
    const gaps = titles.map((title) => {
      const box = title.getBoundingClientRect()
      for (const cell of cells) expect(meets(box, cell)).toBe(false)
      const above = Math.max(
        ...rows.filter((row) => row.bottom <= box.top).map((row) => row.bottom)
      )
      const below = Math.min(
        ...rows.filter((row) => row.top >= box.bottom).map((row) => row.top)
      )
      return { above: box.top - above, below: below - box.bottom }
    })
    const between = gaps.filter((gap) => isFinite(gap.above))
    for (const gap of between) {
      expect(gap.above).toBeCloseTo(between[0]!.above, 0)
      expect(gap.above).toBeGreaterThan(gap.below)
    }
    for (const gap of gaps) expect(gap.below).toBeCloseTo(gaps[0]!.below, 0)
    return titles.length
  }

  it.each([
    { label: 'stacked', props: { numberOfMonths: 2 } },
    {
      label: 'vertical, two months',
      props: { numberOfMonths: 2, direction: 'vertical' as const }
    },
    { label: 'vertical, one month', props: { direction: 'vertical' as const } }
  ])(
    'keeps titles clear of the days at rest and mid-turn, $label',
    async ({ props }) => {
      // A four-row February, a five-row January and a six-row May.
      for (const month of ['2027-01-01', '2027-02-01', '2027-05-01']) {
        const animate = Element.prototype.animate
        const spy = vi
          .spyOn(Element.prototype, 'animate')
          .mockImplementation(function (this: Element, frames, options) {
            return animate.call(this, frames, {
              ...(options as object),
              duration: 60_000
            })
          })
        render(
          <div className='w-97.5'>
            <Calendar today={TODAY} defaultMonth={month} {...props} />
          </div>
        )
        await expect
          .poll(() =>
            document
              .querySelector('[data-slot="calendar"]')!
              .getAttribute('data-paging')
          )
          .toBe('vertical')
        titlesSitInTheirGaps()
        for (const name of ['Next month', 'Previous month']) {
          await userEvent.click(screen.getByRole('button', { name }))
          for (const animation of document.getAnimations())
            animation.currentTime = 30_000
          expect(titlesSitInTheirGaps()).toBeGreaterThan(0)
          for (const animation of document.getAnimations()) animation.finish()
          await expect
            .poll(() =>
              document
                .querySelector('[data-slot="calendar"]')!
                .hasAttribute('data-swiping')
            )
            .toBe(false)
          titlesSitInTheirGaps()
        }
        spy.mockRestore()
        cleanup()
      }
    }
  )
})

describe('Calendar switching views from stacked months', () => {
  it('eases to the week and leaves nothing over it when the months stop stacking', async () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} numberOfMonths={2} views={['week', 'month']} />
      </div>
    )
    await expect
      .poll(() =>
        document
          .querySelector('[data-slot="calendar"]')!
          .getAttribute('data-paging')
      )
      .toBe('vertical')
    await userEvent.click(screen.getByRole('button', { name: 'Week' }))
    // It eases in, though the switch sets the calendar up anew.
    await expect
      .poll(() => document.querySelector('[data-leaving]'))
      .not.toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(document.querySelector('[data-leaving]')).toBeNull()
    expect(
      document
        .querySelector('[data-slot="calendar"]')!
        .hasAttribute('data-swiping')
    ).toBe(false)
    expect(screen.getAllByRole('grid')).toHaveLength(1)
  })
})

describe('Calendar switching views opens the right page', () => {
  const opens = async (
    props: Partial<CalendarSingleProps>,
    view: 'Month' | 'Week',
    focus?: string
  ) => {
    render(
      <Calendar
        today={TODAY}
        views={['week', 'month']}
        defaultView={view === 'Month' ? 'week' : 'month'}
        {...props}
      />
    )
    if (focus)
      (
        document.querySelector(
          `button[data-date="${focus}"]:not([data-outside])`
        ) as HTMLElement
      ).focus()
    await userEvent.click(screen.getByRole('button', { name: view }))
    await viewSettled(view === 'Month' ? 'month' : 'week')
  }

  it('opens the month of the day selected in the week', async () => {
    await opens(
      { defaultMonth: '2026-11-01', defaultSelected: '2026-10-28' },
      'Month'
    )
    expect(screen.getByRole('grid')).toHaveAccessibleName('October 2026')
  })

  it('opens the month of the day focused in the week', async () => {
    await opens({ defaultMonth: '2026-11-01' }, 'Month', '2026-11-01')
    expect(screen.getByRole('grid')).toHaveAccessibleName('November 2026')
  })

  it('opens the month holding most of the week', async () => {
    await opens({ defaultMonth: '2027-01-01' }, 'Month')
    expect(screen.getByRole('grid')).toHaveAccessibleName('December 2026')
  })

  it.each([
    [{ defaultSelected: '2026-10-28' }, undefined, '2026-10-26'],
    [{}, '2026-10-14', '2026-10-12'],
    [{}, undefined, '2026-09-28']
  ] as const)(
    'opens the week of a selected, then focused, then first day, %#',
    async (props, focus, first) => {
      await opens({ defaultMonth: '2026-10-01', ...props }, 'Week', focus)
      expect(
        within(screen.getByRole('grid'))
          .getAllByRole('button')
          .map((button) => button.dataset.date)[0]
      ).toBe(first)
    }
  )
})

describe('Calendar scrolling inside a ScrollArea', () => {
  it('scrolls to its month, pins its weekdays and reports the month on top', async () => {
    const onMonthChange = vi.fn()
    render(
      <ScrollArea className='h-96'>
        <ScrollArea.Viewport>
          <Calendar
            today={TODAY}
            layout='scroll'
            mode='range'
            defaultSelected={{ start: '2026-11-06', end: '2026-11-12' }}
            onMonthChange={onMonthChange}
          />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea>
    )
    const viewport = document.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    )!
    const weekdays = document.querySelector('[data-slot="calendar-weekdays"]')!
    const month = (first: string) =>
      document.querySelector(`[data-month="${first}"]`)!
    const atTop = (first: string) =>
      Math.abs(
        month(first).getBoundingClientRect().top -
          weekdays.getBoundingClientRect().bottom
      )
    await expect.poll(() => atTop('2026-11-01')).toBeLessThan(2)
    viewport.scrollTop +=
      month('2026-11-01').getBoundingClientRect().height + 60
    await expect.poll(() => onMonthChange.mock.lastCall?.[0]).toBe('2026-12-01')
    expect(weekdays.getBoundingClientRect().top).toBeCloseTo(
      viewport.getBoundingClientRect().top,
      0
    )
  })
})
